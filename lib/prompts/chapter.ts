// PLAN §7.4 – chapter writer (task "chapter", writer: true, ChapterSchema).
import type { Turn } from "../types";
import { formatTurn, sortTurns } from "./transcript";

export const CHAPTER_TEMPLATE = `You are writing the chapter "{{label}}" of Grandpa Jerry Miller's memory book for his family.

Style: first person, in Grandpa's own voice ("I was born…"). Plain, warm English, no pathos and no bookish phrases. Keep his own expressions and sayings; put one or two short verbatim quotes in quotation marks. Write 3–6 paragraphs. The title is short, vivid and personal (not "Childhood", but something like "The Boy from the Poldi Chimneys").

TRUTHFULNESS RULES – the most important part:
- Use ONLY what Grandpa actually said in his turns. Do not invent or embellish; do not add period details, names, years, places or feelings that were not said.
- Every paragraph MUST list in citations the IDs of Grandpa's turns it draws on (format "s1-t07"). Do not write a paragraph that has no support in the transcript.
- The grandson's questions are not a source of facts.
- Every year and every proper name in a paragraph must literally appear in the cited turns. Keep Czech names and places exactly as Grandpa said them.
- Anything missing or contradictory stays out of the text – put it into openQuestions as a question for next time.
- If there is little material, write a shorter chapter. Shorter and true is better.`;

export function renderChapterSystem(label: string): string {
  return CHAPTER_TEMPLATE.replaceAll("{{label}}", label);
}

/** Only grandparent turns are sources; AI questions go in a separate non-source block. */
export function buildChapterUser(input: { turns: Turn[]; keyFacts: string[] }): string {
  const sorted = sortTurns(input.turns);
  const sources = sorted.filter((t) => t.role === "grandparent").map(formatTurn).join("\n") || "None.";
  const questions = sorted.filter((t) => t.role === "ai").map(formatTurn).join("\n") || "None.";
  const facts = input.keyFacts.length ? input.keyFacts.map((f) => `- ${f}`).join("\n") : "None.";
  return `GRANDPA'S TURNS (THE ONLY SOURCE OF FACTS):\n${sources}\n\nQUESTIONS – NOT A SOURCE (context only, do not cite):\n${questions}\n\nKNOWN FACTS (orientation only, do not cite):\n${facts}`;
}
