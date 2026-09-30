// PLAN §8 finalizeSession – owned by WP2. Server only.
import type { Chapter, Db, Match, OpenThread, PersonEntity, SessionSummary } from "./types";
import { getDb, updateDb } from "./store";
import { llmStructured } from "./llm";
import { ExtractionSchema, SessionSummarySchema, type ExtractionOutput, type SessionSummaryOutput } from "./schemas";
import { newId, nowIso } from "./ids";
import { buildSummarizerUser, SUMMARIZER_SYSTEM } from "./prompts/summarizer";
import { buildExtractorUser, renderExtractorSystem } from "./prompts/extractor";
import { mergeEntities } from "./entities";
import { suggestMatches } from "./matching/match";
import { FIRST_SESSION_OPENER } from "./memory";

export interface FinalizeResult {
  summary: SessionSummary;
  threads: OpenThread[];
  persons: PersonEntity[];
  matches: Match[];
  chapter?: Chapter;
  nextTopic: string;
}

export interface PipelineTimings { summaryMs: number; extractMs: number; totalMs: number; providers: string[] }

/** LLM part only (no store writes): summary + extraction in parallel. Used by finalize and smoke script. */
export async function analyzeSession(db: Db, sessionId: string): Promise<{
  summary: SessionSummaryOutput; extraction: ExtractionOutput; timings: PipelineTimings;
}> {
  const t0 = Date.now();
  const turns = db.turns.filter((t) => t.sessionId === sessionId).sort((a, b) => a.idx - b.idx);
  const openThreads = db.threads.filter((t) => !t.resolvedInSession);
  const keyFacts = [...new Set(db.summaries.flatMap((s) => s.keyFacts))];

  if (!turns.some((t) => t.role === "grandparent" && t.text.trim())) {
    const last = db.summaries[db.summaries.length - 1];
    return {
      summary: {
        summary: "Povídání bylo krátké, děda tentokrát nic nevyprávěl.",
        topicsCovered: [], newOpenThreads: [], resolvedThreadIds: [],
        nextTopic: last?.nextTopic ?? "Dětství",
        nextSessionOpener: last?.nextSessionOpener ?? FIRST_SESSION_OPENER,
        keyFacts: [],
      },
      extraction: { persons: [], places: [], events: [] },
      timings: { summaryMs: 0, extractMs: 0, totalMs: 0, providers: [] },
    };
  }

  const [s, e] = await Promise.all([
    llmStructured({
      task: "summary", schema: SessionSummarySchema, system: SUMMARIZER_SYSTEM,
      user: buildSummarizerUser({ turns, openThreads, keyFacts }),
    }),
    llmStructured({
      task: "extract", schema: ExtractionSchema, system: renderExtractorSystem(db.grandparent),
      user: buildExtractorUser({ turns, knownPersons: db.persons, grandparent: db.grandparent }),
    }),
  ]);
  return {
    summary: s.data, extraction: fixApproxYears(e.data, turns),
    timings: { summaryMs: s.ms, extractMs: e.ms, totalMs: Date.now() - t0, providers: [`${s.provider}:${s.model}`, `${e.provider}:${e.model}`] },
  };
}

/** A birth year that was never said literally (computed, e.g. "o dva roky mladší") is approximate. */
export function fixApproxYears(ex: ExtractionOutput, turns: { id: string; text: string }[]): ExtractionOutput {
  const byId = new Map(turns.map((t) => [t.id, t.text]));
  return {
    ...ex,
    persons: ex.persons.map((p) => {
      if (p.birthYear == null || p.birthYearApprox) return p;
      const said = p.turnIds.some((id) => (byId.get(id) ?? "").includes(String(p.birthYear)));
      return said ? p : { ...p, birthYearApprox: true };
    }),
  };
}

const inflight = new Map<string, Promise<FinalizeResult>>();

/** Idempotent: a done session returns the stored result; concurrent calls share one run. */
export function finalizeSession(sessionId: string): Promise<FinalizeResult> {
  const running = inflight.get(sessionId);
  if (running) return running;
  const p = runFinalize(sessionId).finally(() => inflight.delete(sessionId));
  inflight.set(sessionId, p);
  return p;
}

async function runFinalize(sessionId: string): Promise<FinalizeResult> {
  const db0 = await getDb();
  const session = db0.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  const existing = db0.summaries.find((s) => s.sessionId === sessionId);
  if (session.status === "done" && existing) {
    return { summary: existing, threads: db0.threads, persons: db0.persons, matches: db0.matches, nextTopic: existing.nextTopic };
  }

  await updateDb((db) => {
    const s = db.sessions.find((x) => x.id === sessionId);
    if (s) { s.status = "finalizing"; s.endedAt = s.endedAt ?? nowIso(); }
  });

  try {
    const { summary: out, extraction } = await analyzeSession(db0, sessionId);
    return await updateDb((db) => {
      const sessionTurnIds = new Set(db.turns.filter((t) => t.sessionId === sessionId).map((t) => t.id));
      const allTurnIds = new Set(db.turns.map((t) => t.id));
      const threadIds = new Set(db.threads.map((t) => t.id));
      const summary: SessionSummary = {
        ...out,
        sessionId,
        topicsCovered: [...new Set(out.topicsCovered)],
        newOpenThreads: out.newOpenThreads
          .map((t) => ({ ...t, turnIds: t.turnIds.filter((id) => sessionTurnIds.has(id)) }))
          .filter((t) => t.title.trim()),
        resolvedThreadIds: out.resolvedThreadIds.filter((id) => threadIds.has(id)),
        keyFacts: out.keyFacts.slice(0, 8),
      };
      db.summaries = db.summaries.filter((s) => s.sessionId !== sessionId).concat(summary);
      // threads (idempotent: replace ones previously created by this session's summary)
      db.threads = db.threads.filter((t) => !(t.createdInSession === sessionId && t.source === "summary"));
      for (const t of summary.newOpenThreads) {
        db.threads.push({ ...t, id: newId("th"), createdInSession: sessionId, resolvedInSession: null, source: "summary" });
      }
      for (const t of db.threads) {
        if (summary.resolvedThreadIds.includes(t.id) && !t.resolvedInSession) t.resolvedInSession = sessionId;
      }
      // entities + matches
      const merged = mergeEntities({ persons: db.persons, places: db.places, events: db.events }, extraction, allTurnIds);
      db.persons = merged.persons;
      db.places = merged.places;
      db.events = merged.events;
      db.matches = suggestMatches(db.persons, db.tree, [db.grandparent.treePersonId], db.matches);

      const s = db.sessions.find((x) => x.id === sessionId);
      if (s) { s.status = "done"; s.endedAt = s.endedAt ?? nowIso(); }
      return { summary, threads: db.threads, persons: db.persons, matches: db.matches, nextTopic: summary.nextTopic };
    });
  } catch (e) {
    await updateDb((db) => {
      const s = db.sessions.find((x) => x.id === sessionId);
      if (s) s.status = "failed";
    }).catch(() => undefined);
    throw e;
  }
}
