// Phone-call channel: grandpa gets a real phone call from "Tom" (ElevenLabs agent over a Twilio number).
// Server only. Never import from client components.
//
// ElevenLabs endpoints used (verified against @elevenlabs/elevenlabs-js 2.70 types):
//   POST /v1/convai/twilio/outbound-call  {agent_id, agent_phone_number_id, to_number, conversation_initiation_client_data:{dynamic_variables}}
//        -> {success, message, conversation_id?, callSid?}
//   Conversation-initiation webhook (inbound):  our POST /api/phone/init returns
//        {type:"conversation_initiation_client_data", dynamic_variables:{...}}
//   Post-call webhook: {type:"post_call_transcription", data:{conversation_id, transcript:[{role, message}], conversation_initiation_client_data:{dynamic_variables}}}
//        signed with header `ElevenLabs-Signature: t=<unix>,v0=<hex hmac_sha256(secret, "<t>.<raw body>")>`
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Db, MemoryContext, Session, Turn } from "./types";
import { updateDb } from "./store";
import { buildMemory } from "./memory";
import { buildDynamicVariables } from "./prompts/grandchild";
import { nextSessionId, nowIso, turnId } from "./ids";

export const EL_API = "https://api.elevenlabs.io";

// ---------- config ----------
export function phoneConfig() {
  const e = process.env;
  const c = {
    elevenlabsApiKey: !!e.ELEVENLABS_API_KEY,
    agentId: !!e.ELEVENLABS_AGENT_ID,
    phoneNumberId: !!e.ELEVENLABS_PHONE_NUMBER_ID,
    grandpaNumber: !!e.GRANDPA_PHONE_NUMBER,
    twilioAccountSid: !!e.TWILIO_ACCOUNT_SID,
    twilioAuthToken: !!e.TWILIO_AUTH_TOKEN,
    twilioPhoneNumber: !!e.TWILIO_PHONE_NUMBER,
    webhookSecret: !!e.ELEVENLABS_WEBHOOK_SECRET,
    initSecret: !!e.ELEVENLABS_INIT_SECRET,
    publicBaseUrl: !!e.PUBLIC_BASE_URL,
  };
  return { ...c, canCall: c.elevenlabsApiKey && c.agentId && c.phoneNumberId };
}

// ---------- signature ----------
/** Verifies `ElevenLabs-Signature: t=<unix seconds>,v0=<hex>` over `${t}.${rawBody}`. */
export function verifyElevenLabsSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  opts: { nowSec?: number; toleranceSec?: number } = {},
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  const t = Number(parts.t);
  const v0 = parts.v0;
  if (!Number.isFinite(t) || !v0) return false;
  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > (opts.toleranceSec ?? 30 * 60)) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v0, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Helper for tests / local tools: produce a valid signature header. */
export function signElevenLabsPayload(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v0=${createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex")}`;
}

// ---------- transcript mapping ----------
export interface ElTranscriptEntry {
  role?: string | null;
  message?: string | null;
  time_in_call_secs?: number | null;
}

export interface PostCallPayload {
  type?: string;
  event_timestamp?: number;
  data?: {
    agent_id?: string;
    conversation_id?: string;
    status?: string;
    transcript?: ElTranscriptEntry[] | null;
    metadata?: { start_time_unix_secs?: number; call_duration_secs?: number } & Record<string, unknown>;
    conversation_initiation_client_data?: { dynamic_variables?: Record<string, unknown> | null } | null;
  };
}

/** ElevenLabs transcript -> our turns. user -> grandparent, agent -> ai, clientSeq = index in transcript; empty messages (tool calls) skipped. */
export function transcriptToTurns(sessionId: string, transcript: ElTranscriptEntry[] | null | undefined, startIso = nowIso()): Turn[] {
  const start = Date.parse(startIso);
  const out: Turn[] = [];
  (transcript ?? []).forEach((e, i) => {
    const text = (e.message ?? "").trim();
    if (!text || (e.role !== "user" && e.role !== "agent")) return;
    const idx = out.length + 1;
    const at = Number.isFinite(start) && typeof e.time_in_call_secs === "number"
      ? new Date(start + e.time_in_call_secs * 1000).toISOString()
      : startIso;
    out.push({ id: turnId(sessionId, idx), sessionId, idx, clientSeq: i, role: e.role === "user" ? "grandparent" : "ai", text, at });
  });
  return out;
}

// ---------- store helpers ----------
export type DynamicVariables = Record<string, string>;

function newVoiceSession(db: Db, memory: MemoryContext): Session {
  const { id, index } = nextSessionId(db.sessions);
  const session: Session = {
    id, grandparentId: db.grandparent.id, index, startedAt: nowIso(), endedAt: null, mode: "voice",
    status: "live", elConversationId: null, firstMessage: memory.firstMessage,
    continuedThreadId: memory.continuedThreadId,
  };
  db.sessions.push(session);
  return session;
}

/** Creates a live voice session + memory, returns dynamic variables (incl. session_id) for the agent. */
export async function createPhoneSession(): Promise<{ session: Session; dynamicVariables: DynamicVariables }> {
  const { session, memory } = await updateDb((db) => {
    const memory = buildMemory(db);
    return { session: newVoiceSession(db, memory), memory };
  });
  return { session, dynamicVariables: { ...buildDynamicVariables(memory), session_id: session.id } };
}

/**
 * Init webhook (ElevenLabs calls it only for INBOUND Twilio calls): always a fresh session,
 * immediately linked to the ElevenLabs conversation id so the post-call webhook finds it.
 */
export async function createInboundSession(conversationId?: string | null): Promise<{ session: Session; dynamicVariables: DynamicVariables }> {
  const { session, memory } = await updateDb((db) => {
    const memory = buildMemory(db);
    const session = newVoiceSession(db, memory);
    if (conversationId) session.elConversationId = conversationId;
    return { session, memory };
  });
  return { session, dynamicVariables: { ...buildDynamicVariables(memory), session_id: session.id } };
}

export async function setConversationId(sessionId: string, conversationId: string): Promise<void> {
  await updateDb((db) => {
    const s = db.sessions.find((x) => x.id === sessionId);
    if (s) s.elConversationId = conversationId;
  });
}

/** call_initiation_failure (busy / no answer / failed): mark the matching session failed. Returns its id or null. */
export async function markCallFailed(conversationId: string | null | undefined, sessionIdHint?: unknown): Promise<string | null> {
  if (!conversationId && typeof sessionIdHint !== "string") return null;
  return updateDb((db) => {
    const s =
      (conversationId ? db.sessions.find((x) => x.elConversationId === conversationId) : undefined) ??
      (typeof sessionIdHint === "string" ? db.sessions.find((x) => x.id === sessionIdHint) : undefined);
    if (!s || s.status === "done" || s.status === "finalizing") return s?.id ?? null;
    s.status = "failed";
    s.endedAt = s.endedAt ?? nowIso();
    return s.id;
  });
}

export type IngestResult =
  | { ignored: true }
  | { ignored?: false; sessionId: string; turns: number; alreadyFinal: boolean };

/**
 * Resolve the session for a post-call payload and store its transcript.
 * Unmatched payloads only create a new session for phone calls (metadata.phone_call or dynamic session_id);
 * other conversations (web /talk) already store their own turns -> ignored.
 */
export async function ingestPostCall(payload: PostCallPayload): Promise<IngestResult> {
  const data = payload.data ?? {};
  const convId = data.conversation_id ?? null;
  const dynSessionId = data.conversation_initiation_client_data?.dynamic_variables?.session_id;
  const startSec = data.metadata?.start_time_unix_secs;
  const isPhone = !!data.metadata?.phone_call || typeof dynSessionId === "string";

  return updateDb((db): IngestResult => {
    let session =
      (convId ? db.sessions.find((s) => s.elConversationId === convId) : undefined) ??
      (typeof dynSessionId === "string" ? db.sessions.find((s) => s.id === dynSessionId) : undefined);
    if (!session) {
      if (!isPhone) return { ignored: true };
      session = newVoiceSession(db, buildMemory(db));
    }
    const sid = session.id;
    if (convId && !session.elConversationId) session.elConversationId = convId;
    const alreadyFinal = session.status === "finalizing" || session.status === "done";

    const startIso = typeof startSec === "number" ? new Date(startSec * 1000).toISOString() : session.startedAt;
    const incoming = transcriptToTurns(sid, data.transcript, startIso);
    const seen = new Set(db.turns.filter((t) => t.sessionId === sid).map((t) => t.clientSeq));
    for (const t of incoming) {
      if (seen.has(t.clientSeq)) continue; // webhook retry -> dedupe
      db.turns.push(t);
    }
    // ids consistent with idx: renumber after sorting by clientSeq
    db.turns
      .filter((t) => t.sessionId === sid)
      .sort((a, b) => a.clientSeq - b.clientSeq)
      .forEach((t, i) => { t.idx = i + 1; t.id = turnId(sid, i + 1); });
    if (!session.endedAt) {
      const dur = data.metadata?.call_duration_secs;
      session.endedAt = typeof dur === "number" && typeof startSec === "number"
        ? new Date((startSec + dur) * 1000).toISOString()
        : nowIso();
    }
    if (session.status === "failed" && incoming.length) session.status = "live"; // transcript wins over a stale failure
    return { sessionId: sid, turns: db.turns.filter((t) => t.sessionId === sid).length, alreadyFinal };
  });
}

// ---------- ElevenLabs outbound call ----------
export async function startOutboundCall(toNumber: string, dynamicVariables: DynamicVariables): Promise<{ conversationId: string | null; callSid: string | null }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  if (!apiKey || !agentId || !phoneNumberId) throw new Error("Phone not configured (ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID / ELEVENLABS_PHONE_NUMBER_ID)");
  const res = await fetch(`${EL_API}/v1/convai/twilio/outbound-call`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: toNumber,
      conversation_initiation_client_data: { dynamic_variables: dynamicVariables },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let body: { success?: boolean; message?: string; conversation_id?: string; callSid?: string; call_sid?: string; detail?: unknown } = {};
  try { body = JSON.parse(text); } catch { /* non-JSON error */ }
  if (!res.ok || body.success === false) {
    throw new Error(`Outbound call failed (${res.status}): ${body.message ?? (body.detail ? JSON.stringify(body.detail) : text.slice(0, 300))}`);
  }
  return { conversationId: body.conversation_id ?? null, callSid: body.callSid ?? body.call_sid ?? null };
}

/** Normalize a phone number to E.164-ish (+digits). */
export function normalizeNumber(n: string): string {
  const t = n.trim().replace(/[\s()-]/g, "");
  return t.startsWith("00") ? `+${t.slice(2)}` : t;
}
