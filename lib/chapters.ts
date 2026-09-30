// PLAN §7.4 – chapter generation + citation validation. Owned by WP2.
import type { Chapter, ChapterParagraph, Citation, Db, LifeTopicKey, OpenThread, Turn } from "./types";
import { ChapterSchema, type ChapterOutput } from "./schemas";
import { llmStructured } from "./llm";
import { buildChapterUser, renderChapterSystem } from "./prompts/chapter";
import { topicLabel } from "./topics";
import { getDb, updateDb } from "./store";
import { newId, nowIso } from "./ids";
import { norm } from "./entities";

const QUOTE_LEN = 160;
const YEAR_RE = /\b(19|20)\d{2}\b/g;

function tokens(s: string): string[] {
  return norm(s).split(" ").filter(Boolean);
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** Czech declension tolerant match: "Pepou" ~ "Pepa", "Kladně" ~ "Kladno". */
function wordInTokens(word: string, toks: string[]): boolean {
  const w = norm(word);
  if (!w) return true;
  return toks.some((t) => t === w || commonPrefix(t, w) >= Math.max(3, Math.min(t.length, w.length) - 2));
}

/** English words that are capitalized but are not names. */
const NOT_NAMES = new Set(["I", "OK"]);

/** Capitalized words that are not at the start of a sentence (or quoted speech). */
export function properNames(text: string): string[] {
  const out: string[] = [];
  const re = /[\p{L}]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const w = m[0];
    if (!/^\p{Lu}/u.test(w) || NOT_NAMES.has(w)) continue;
    const before = text.slice(0, m.index).replace(/\s+$/, "");
    const prev = before.slice(-1);
    const sentenceStart = before === "" || /[.!?…:„“"‚‘'«»(–—-]/.test(prev);
    if (sentenceStart) continue;
    out.push(w);
  }
  return [...new Set(out)];
}

export function validateParagraph(text: string, citations: Citation[], turnsById: Map<string, Turn>): { verified: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!citations.length) warnings.push("This paragraph has no valid citation of Grandpa's words.");
  const cited = citations.map((c) => turnsById.get(c.turnId)?.text ?? "").join(" \n ");
  const citedToks = tokens(cited);
  for (const y of new Set(text.match(YEAR_RE) ?? [])) {
    if (!cited.includes(y)) warnings.push(`The year ${y} does not appear in the cited turns.`);
  }
  if (citations.length) {
    for (const name of properNames(text)) {
      if (!wordInTokens(name, citedToks)) warnings.push(`The name "${name}" does not appear in the cited turns.`);
    }
  }
  return { verified: warnings.length === 0, warnings };
}

/** Drops unknown/AI citations, fills quotes, checks years and proper names. */
export function validateCitations(chapter: ChapterOutput, turns: Turn[]): ChapterParagraph[] {
  const byId = new Map(turns.map((t) => [t.id, t]));
  return chapter.paragraphs.map((p) => {
    const citations: Citation[] = [];
    for (const cid of new Set(p.citations.map((c) => c.trim().replace(/^\[|\]$/g, "")))) {
      const t = byId.get(cid);
      if (t && t.role === "grandparent") citations.push({ turnId: t.id, quote: t.text.slice(0, QUOTE_LEN) });
    }
    const { verified, warnings } = validateParagraph(p.text, citations, byId);
    return { id: newId("p"), text: p.text, citations, verified, warnings, editedByFamily: false };
  });
}

/** LLM call only (no store writes) – used by generateChapter and the smoke script. */
export async function draftChapter(db: Db, key: LifeTopicKey): Promise<{ chapter: Chapter; ms: number; provider: string }> {
  const turns = db.turns;
  if (!turns.some((t) => t.role === "grandparent")) throw new Error("Nothing to write from yet – Grandpa hasn't told any stories.");
  const keyFacts = [...new Set(db.summaries.flatMap((s) => s.keyFacts))];
  const { data, model, ms, provider } = await llmStructured({
    task: "chapter",
    schema: ChapterSchema,
    system: renderChapterSystem(topicLabel(key)),
    user: buildChapterUser({ turns, keyFacts }),
    writer: true,
  });
  const chapter: Chapter = {
    id: newId("ch"), key, title: data.title.trim(),
    paragraphs: validateCitations(data, turns),
    openQuestions: data.openQuestions.map((q) => q.trim()).filter(Boolean),
    status: "draft", generatedAt: nowIso(), model,
  };
  return { chapter, ms, provider };
}

export async function generateChapter(key: LifeTopicKey): Promise<Chapter> {
  const { chapter } = await draftChapter(await getDb(), key);
  const lastSessionId = (db: Db) => db.sessions.reduce((a, s) => (s.index > (a?.index ?? -1) ? s : a), db.sessions[0])?.id ?? "s0";
  return updateDb((db) => {
    db.chapters = db.chapters.filter((c) => c.key !== key).concat(chapter);
    const existingTitles = new Set(db.threads.map((t) => t.title.trim().toLowerCase()));
    for (const q of chapter.openQuestions) {
      if (existingTitles.has(q.toLowerCase())) continue;
      const th: OpenThread = {
        id: newId("th"), title: q, whyUnfinished: "Question from the chapter – not covered in the conversations yet.",
        turnIds: [], createdInSession: lastSessionId(db), resolvedInSession: null, source: "chapter",
      };
      db.threads.push(th);
    }
    return chapter;
  });
}
