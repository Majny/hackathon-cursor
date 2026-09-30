// PLAN §7.4 – chapter writer (task "chapter", writer: true, ChapterSchema).
import type { Turn } from "../types";
import { formatTurn, sortTurns } from "./transcript";

export const CHAPTER_TEMPLATE = `Píšeš kapitolu „{{label}}“ do knihy vzpomínek dědy Jaroslava Nováka pro jeho rodinu.

Styl: první osoba, dědovým hlasem („Narodil jsem se…“). Prostě, vřele, bez patosu a bez knižních frází. Zachovej jeho výrazy a hlášky, jednu až dvě krátké doslovné citace dej do uvozovek. Napiš 3–6 odstavců. Titulek je krátký, obrazný a osobní (ne „Dětství“, ale třeba „Kluk od komínů Poldovky“).

PRAVIDLA PRAVDIVOSTI – nejdůležitější:
- Používej JEN to, co děda v replikách řekl. Nic nedomýšlej, nepřidávej dobové reálie, jména, roky, místa ani pocity, které nezazněly.
- Každý odstavec MUSÍ mít v citations ID dědových replik (formát „s1-t07“), ze kterých čerpá. Odstavec bez opory v přepisu nepiš.
- Otázky vnuka nejsou zdroj faktů.
- Každý rok a každé vlastní jméno v odstavci musí doslova zaznít v citovaných replikách.
- Co chybí nebo si odporuje, nepiš do textu – dej to do openQuestions jako otázku na příště.
- Když je materiálu málo, napiš kratší kapitolu. Kratší a pravdivé je lepší.`;

export function renderChapterSystem(label: string): string {
  return CHAPTER_TEMPLATE.replaceAll("{{label}}", label);
}

/** Only grandparent turns are sources; AI questions go in a separate non-source block. */
export function buildChapterUser(input: { turns: Turn[]; keyFacts: string[] }): string {
  const sorted = sortTurns(input.turns);
  const sources = sorted.filter((t) => t.role === "grandparent").map(formatTurn).join("\n") || "Žádné.";
  const questions = sorted.filter((t) => t.role === "ai").map(formatTurn).join("\n") || "Žádné.";
  const facts = input.keyFacts.length ? input.keyFacts.map((f) => `- ${f}`).join("\n") : "Žádná.";
  return `REPLIKY DĚDY (JEDINÝ ZDROJ FAKTŮ):\n${sources}\n\nOTÁZKY – NEJSOU ZDROJ (jen kontext, necituj je):\n${questions}\n\nZNÁMÁ FAKTA (jen pro orientaci, necituj je):\n${facts}`;
}
