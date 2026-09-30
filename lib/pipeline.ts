// MINIMAL STUB by WP0 – owned and implemented by WP2 (PLAN §8 finalizeSession).
import type { Chapter, Match, OpenThread, PersonEntity, SessionSummary } from "./types";
import { getDb, updateDb } from "./store";
import { llmStructured } from "./llm";
import { SessionSummarySchema } from "./schemas";
import { newId, nowIso } from "./ids";

export interface FinalizeResult {
  summary: SessionSummary;
  threads: OpenThread[];
  persons: PersonEntity[];
  matches: Match[];
  chapter?: Chapter;
  nextTopic: string;
}

export async function finalizeSession(sessionId: string): Promise<FinalizeResult> {
  const db0 = await getDb();
  const session = db0.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  const existing = db0.summaries.find((s) => s.sessionId === sessionId);
  if (session.status === "done" && existing) {
    return { summary: existing, threads: db0.threads, persons: db0.persons, matches: db0.matches, nextTopic: existing.nextTopic };
  }
  // TODO(WP2): real prompts, extraction, mergeEntities, suggestMatches, optional chapter via after().
  const { data } = await llmStructured({ task: "summary", schema: SessionSummarySchema, system: "", user: "" });
  const summary: SessionSummary = { ...data, sessionId };
  return updateDb((db) => {
    db.summaries = db.summaries.filter((s) => s.sessionId !== sessionId).concat(summary);
    for (const t of summary.newOpenThreads) {
      db.threads.push({ ...t, id: newId("th"), createdInSession: sessionId, resolvedInSession: null, source: "summary" });
    }
    const s = db.sessions.find((x) => x.id === sessionId);
    if (s) { s.status = "done"; s.endedAt = s.endedAt ?? nowIso(); }
    return { summary, threads: db.threads, persons: db.persons, matches: db.matches, nextTopic: summary.nextTopic };
  });
}
