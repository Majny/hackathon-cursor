import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { buildMemory, FIRST_SESSION_OPENER } from "@/lib/memory";
import { SessionSummarySchema, ExtractionSchema } from "@/lib/schemas";
import { mergeEntities } from "@/lib/entities";
import type { Db } from "@/lib/types";

const read = async (p: string) => JSON.parse(await fs.readFile(path.join(process.cwd(), p), "utf8"));

/** after-s1 snapshot if WP5 already made it, else built from empty + fixtures. */
async function afterS1(): Promise<Db> {
  try { return await read("data/snapshots/after-s1.json"); } catch { /* build */ }
  const db = (await read("data/snapshots/empty.json")) as Db;
  const summary = SessionSummarySchema.parse(await read("data/fixtures/summary.json"));
  const ex = ExtractionSchema.parse(await read("data/fixtures/extraction.json"));
  db.sessions.push({ id: "s1", grandparentId: "jaroslav", index: 1, startedAt: "2026-09-30T10:00:00Z", endedAt: "2026-09-30T10:10:00Z",
    mode: "voice", status: "done", elConversationId: null, firstMessage: FIRST_SESSION_OPENER, continuedThreadId: null });
  for (let i = 1; i <= 18; i++) db.turns.push({ id: `s1-t${String(i).padStart(2, "0")}`, sessionId: "s1", idx: i, clientSeq: i,
    role: i % 2 ? "grandparent" : "ai", text: "…", at: "" });
  db.summaries.push({ ...summary, sessionId: "s1" });
  summary.newOpenThreads.forEach((t, i) => db.threads.push({ ...t, id: `th-${i}`, createdInSession: "s1", resolvedInSession: null, source: "summary" }));
  Object.assign(db, mergeEntities(db, ex, new Set(db.turns.map((t) => t.id))));
  return db;
}

describe("buildMemory", () => {
  it("empty -> first session template", async () => {
    const m = buildMemory(await read("data/snapshots/empty.json"));
    expect(m.isFirstSession).toBe(true);
    expect(m.firstMessage).toBe(FIRST_SESSION_OPENER);
    expect(m.sessionNo).toBe(1);
    expect(m.continuedThreadId).toBeNull();
    expect(m.memorySummary).toBe("None.");
  });

  it("after-s1 -> continues the fair story", async () => {
    const db = await afterS1();
    const m = buildMemory(db);
    const last = db.summaries[db.summaries.length - 1];
    expect(m.isFirstSession).toBe(false);
    expect(m.firstMessage).toBe(last.nextSessionOpener);
    expect(m.openThreads.toLowerCase()).toContain("fair");
    expect(m.memorySummary).toMatch(/^Session 1/);
    expect(m.memorySummary.length).toBeLessThanOrEqual(1500);
    expect(m.knownPeople).toContain("Pepa Dvořák");
    expect(m.continuedThreadId).toBeTruthy();
    expect(m.uncoveredTopics).not.toContain("Childhood");
    expect(m.uncoveredTopics).toContain("Military service");
  });
});
