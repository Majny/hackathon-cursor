// PLAN §8 – deterministic memory across sessions (no LLM). Owned by WP2.
import type { Db, MemoryContext, PersonEntity } from "./types";
import { LIFE_TOPICS } from "./topics";

export const FIRST_SESSION_OPENER =
  "Hi Grandpa, it's me, Tom. I'd love to hear about when you were little. Where did you grow up?";

const MEMORY_MAX = 1500;
const NONE = "None.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function firstSentence(s: string): string {
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim();
}

function endWithDot(s: string): string {
  const t = s.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

export function buildMemorySummary(db: Db): string {
  const summaries = db.summaries;
  if (!summaries.length) return NONE;
  const sessionById = new Map(db.sessions.map((s) => [s.id, s]));
  const facts = [...new Set(summaries.flatMap((s) => s.keyFacts))];
  const factsLine = facts.length ? `Key facts: ${facts.join("; ")}.` : "";
  const line = (i: number, text: string) => {
    const s = sessionById.get(summaries[i].sessionId);
    const date = shortDate(s?.startedAt);
    return `Session ${s?.index ?? i + 1}${date ? ` (${date})` : ""}: ${text}`;
  };
  const full = summaries.map((s) => s.summary.trim());
  const compose = (texts: string[]) => [...texts.map((t, i) => line(i, t)), factsLine].filter(Boolean).join("\n");
  let out = compose(full);
  // Shorten older summaries to their first sentence (oldest first) until it fits.
  for (let i = 0; i < full.length - 1 && out.length > MEMORY_MAX; i++) {
    full[i] = firstSentence(full[i]);
    out = compose(full);
  }
  return out.length > MEMORY_MAX ? `${out.slice(0, MEMORY_MAX - 1).trimEnd()}…` : out;
}

export function describePerson(p: PersonEntity): string {
  const extras = [p.relationToGrandparent, p.place, p.birthYear ? `${p.birthYearApprox ? "born c. " : "born "}${p.birthYear}` : null]
    .map((x) => (x ?? "").toString().trim())
    .filter(Boolean);
  return extras.length ? `${p.mentionName} (${extras.join(", ")})` : p.mentionName;
}

export function buildMemory(db: Db): MemoryContext {
  const summaries = db.summaries;
  const last = summaries[summaries.length - 1];
  const open = db.threads.filter((t) => !t.resolvedInSession);
  const covered = new Set(summaries.flatMap((s) => s.topicsCovered));
  const uncovered = LIFE_TOPICS.filter((t) => !covered.has(t.key));

  const knownPeople = db.persons.length ? db.persons.slice(0, 10).map(describePerson).join("; ") : NONE;
  const openThreads = open.length
    ? open.map((t) => endWithDot(t.whyUnfinished ? `${t.title} – ${t.whyUnfinished.replace(/[.]\s*$/, "")}` : t.title)).join("\n")
    : NONE;

  return {
    grandparentName: db.grandparent.fullName,
    grandchildName: db.grandparent.grandchildName,
    birthYear: db.grandparent.birthYear,
    sessionNo: db.sessions.reduce((m, s) => Math.max(m, s.index), 0) + 1,
    isFirstSession: summaries.length === 0,
    memorySummary: buildMemorySummary(db),
    knownPeople,
    openThreads,
    nextTopic: last?.nextTopic?.trim() || open[0]?.title || uncovered[0]?.label || "Childhood",
    uncoveredTopics: uncovered.map((t) => t.label).join(", ") || NONE,
    firstMessage: last?.nextSessionOpener?.trim() || FIRST_SESSION_OPENER,
    continuedThreadId: last ? (open[0]?.id ?? null) : null,
  };
}
