import { beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  createInboundSession, ingestPostCall, markCallFailed, normalizeNumber, signElevenLabsPayload,
  transcriptToTurns, verifyElevenLabsSignature,
} from "@/lib/phone";
import { getDb, loadSnapshot, updateDb } from "@/lib/store";

const SECRET = "wsec_test123";
const BODY = JSON.stringify({ type: "post_call_transcription", data: { conversation_id: "conv_1", transcript: [] } });

describe("ElevenLabs webhook signature", () => {
  const t = 1_790_000_000;
  it("accepts a valid signature", () => {
    const header = signElevenLabsPayload(BODY, SECRET, t);
    expect(header).toMatch(/^t=\d+,v0=[0-9a-f]{64}$/);
    expect(verifyElevenLabsSignature(BODY, header, SECRET, { nowSec: t + 5 })).toBe(true);
  });
  it("rejects tampered body, wrong secret, missing header, stale timestamp", () => {
    const header = signElevenLabsPayload(BODY, SECRET, t);
    expect(verifyElevenLabsSignature(BODY + " ", header, SECRET, { nowSec: t })).toBe(false);
    expect(verifyElevenLabsSignature(BODY, header, "other", { nowSec: t })).toBe(false);
    expect(verifyElevenLabsSignature(BODY, null, SECRET, { nowSec: t })).toBe(false);
    expect(verifyElevenLabsSignature(BODY, "garbage", SECRET, { nowSec: t })).toBe(false);
    expect(verifyElevenLabsSignature(BODY, header, SECRET, { nowSec: t + 3600 })).toBe(false);
  });
  it("tolerates spaces in the header", () => {
    const header = signElevenLabsPayload(BODY, SECRET, t).replace(",", ", ");
    expect(verifyElevenLabsSignature(BODY, header, SECRET, { nowSec: t })).toBe(true);
  });
});

describe("transcript → turns", () => {
  it("maps roles, skips empty/tool entries, keeps clientSeq = transcript index", () => {
    const turns = transcriptToTurns(
      "s3",
      [
        { role: "agent", message: "Hi Grandpa, it's Tom!", time_in_call_secs: 0 },
        { role: "user", message: "  Ahoj Tome.  ", time_in_call_secs: 3 },
        { role: "agent", message: null, time_in_call_secs: 4 },
        { role: "user", message: "Pepa and I ran off to Prague.", time_in_call_secs: 10 },
      ],
      "2026-09-30T14:00:00.000Z",
    );
    expect(turns.map((t) => [t.id, t.role, t.clientSeq, t.idx])).toEqual([
      ["s3-t01", "ai", 0, 1],
      ["s3-t02", "grandparent", 1, 2],
      ["s3-t03", "grandparent", 3, 3],
    ]);
    expect(turns[1].text).toBe("Ahoj Tome.");
    expect(turns[2].at).toBe("2026-09-30T14:00:10.000Z");
    expect(turns.every((t) => t.sessionId === "s3")).toBe(true);
  });
  it("handles missing transcript", () => {
    expect(transcriptToTurns("s1", undefined)).toEqual([]);
  });
});

describe("normalizeNumber", () => {
  it("normalizes to E.164", () => {
    expect(normalizeNumber("00420 777 123 456")).toBe("+420777123456");
    expect(normalizeNumber("+420 (777) 123-456")).toBe("+420777123456");
  });
});

describe("phone sessions (file store)", () => {
  beforeEach(async () => {
    process.env.STORE = "file";
    process.env.MOCK_AI = "1";
    process.env.DB_FILE = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "phone-test-")), "db.json");
    await loadSnapshot("empty");
  });

  const transcript = [
    { role: "agent", message: "Hi Grandpa!", time_in_call_secs: 0 },
    { role: "user", message: "Ahoj.", time_in_call_secs: 2 },
    { role: "user", message: "We lived in Brno.", time_in_call_secs: 5 },
  ];

  it("init always creates a new session linked to the conversation id", async () => {
    const a = await createInboundSession("conv_in_1");
    const b = await createInboundSession("conv_in_2");
    expect(a.session.id).not.toBe(b.session.id);
    expect(a.dynamicVariables.session_id).toBe(a.session.id);
    const db = await getDb();
    expect(db.sessions.find((s) => s.id === a.session.id)?.elConversationId).toBe("conv_in_1");
    const res = await ingestPostCall({ type: "post_call_transcription", data: { conversation_id: "conv_in_1", transcript } });
    expect(res).toMatchObject({ sessionId: a.session.id, turns: 3, alreadyFinal: false });
  });

  it("ignores unmatched non-phone conversations, creates session for phone calls", async () => {
    const before = (await getDb()).sessions.length;
    expect(await ingestPostCall({ data: { conversation_id: "web_1", transcript } })).toEqual({ ignored: true });
    expect((await getDb()).sessions.length).toBe(before);
    const r = await ingestPostCall({ data: { conversation_id: "ph_1", transcript, metadata: { phone_call: { direction: "inbound" } } } });
    expect(r.ignored).toBeFalsy();
    expect((await getDb()).sessions.length).toBe(before + 1);
  });

  it("turn ids match idx after out-of-order webhook retries; dedupes", async () => {
    const { session } = await createInboundSession("conv_x");
    await ingestPostCall({ data: { conversation_id: "conv_x", transcript: [transcript[0], { role: "agent", message: "" }, transcript[2]] } });
    const r = await ingestPostCall({ data: { conversation_id: "conv_x", transcript } });
    expect(r).toMatchObject({ turns: 3 });
    const turns = (await getDb()).turns.filter((t) => t.sessionId === session.id).sort((a, b) => a.idx - b.idx);
    expect(turns.map((t) => [t.id, t.idx, t.clientSeq])).toEqual([
      [`${session.id}-t01`, 1, 0],
      [`${session.id}-t02`, 2, 1],
      [`${session.id}-t03`, 3, 2],
    ]);
  });

  it("reports alreadyFinal when session is finalizing/done", async () => {
    const { session } = await createInboundSession("conv_d");
    await updateDb((db) => { db.sessions.find((s) => s.id === session.id)!.status = "done"; });
    expect(await ingestPostCall({ data: { conversation_id: "conv_d", transcript } })).toMatchObject({ alreadyFinal: true });
  });

  it("call_initiation_failure marks the session failed", async () => {
    const { session } = await createInboundSession("conv_f");
    expect(await markCallFailed("conv_f")).toBe(session.id);
    const s = (await getDb()).sessions.find((x) => x.id === session.id)!;
    expect(s.status).toBe("failed");
    expect(s.endedAt).toBeTruthy();
    expect(await markCallFailed("nope")).toBeNull();
  });
});
