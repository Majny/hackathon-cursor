// MINIMAL STUB by WP0 – owned and completed by WP2 (PLAN §8). Deterministic, no LLM.
import type { Db, MemoryContext } from "./types";
import { LIFE_TOPICS } from "./topics";

export const FIRST_SESSION_OPENER =
  "Ahoj dědo, to jsem já, Tomáš. Moc rád bych si s tebou povídal o tom, jak jsi byl malý. Kde jsi vyrůstal?";

export function buildMemory(db: Db): MemoryContext {
  const done = db.sessions.filter((s) => s.status === "done");
  const summaries = db.summaries;
  const last = summaries[summaries.length - 1];
  const open = db.threads.filter((t) => !t.resolvedInSession);
  const covered = new Set(summaries.flatMap((s) => s.topicsCovered));
  const uncovered = LIFE_TOPICS.filter((t) => !covered.has(t.key));

  const memorySummary = summaries.length
    ? summaries.map((s, i) => `Povídání ${i + 1}: ${s.summary}`).join("\n") +
      "\nDůležité: " + [...new Set(summaries.flatMap((s) => s.keyFacts))].join("; ")
    : "Žádné.";
  const knownPeople = db.persons.length
    ? db.persons.slice(0, 10).map((p) => `${p.mentionName} (${p.relationToGrandparent})`).join("; ")
    : "Žádné.";
  const openThreads = open.length ? open.map((t) => `${t.title} – ${t.whyUnfinished}`).join("\n") : "Žádné.";

  return {
    grandparentName: db.grandparent.fullName,
    grandchildName: db.grandparent.grandchildName,
    birthYear: db.grandparent.birthYear,
    sessionNo: db.sessions.length + 1,
    isFirstSession: done.length === 0,
    memorySummary,
    knownPeople,
    openThreads,
    nextTopic: last?.nextTopic || open[0]?.title || uncovered[0]?.label || "Dětství",
    uncoveredTopics: uncovered.map((t) => t.label).join(", ") || "Žádné.",
    firstMessage: last?.nextSessionOpener || FIRST_SESSION_OPENER,
    continuedThreadId: last ? (open[0]?.id ?? null) : null,
  };
}
