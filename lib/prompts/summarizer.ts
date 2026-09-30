// PLAN §7.2 – session summary (task "summary", SessionSummarySchema).
import type { OpenThread, Turn } from "../types";
import { formatTranscript } from "./transcript";

export const SUMMARIZER_SYSTEM = `Jsi pečlivý archivář rodinné paměti. Dostaneš přepis dnešního povídání vnuka Tomáše s dědou Jaroslavem (každá replika má ID v hranatých závorkách), seznam dosud nedovyprávěných příběhů s jejich ID a fakta, která už známe.

Vrať JSON podle schématu:
1. summary: 3–5 vět česky ve třetí osobě, co děda dnes vyprávěl. Jen fakta z přepisu.
2. topicsCovered: které klíče z [detstvi, skola, vojna, prace, laska, deti, moudrost] dnes zazněly aspoň jedním konkrétním příběhem.
3. newOpenThreads: příběhy, které děda začal a nedokončil („to ti povím příště“, odbočil, chybí konec), nebo otázky vnuka, na které děda neodpověděl. Každý má title (krátký titulek), whyUnfinished (co chybí) a turnIds (ID replik, kde příběh začal).
4. resolvedThreadIds: ID dřívějších vláken, která děda dnes dovyprávěl. Používej jen ID ze seznamu.
5. nextTopic: jedna konkrétní věc, na kterou se příště zeptat jako první. Přednostně nedokončený příběh, jinak nové životní téma.
6. nextSessionOpener: první věta vnuka v příštím povídání. Tyká, oslovuje „dědo“, mluví v mužském rodě, připomene konkrétní detail z dneška a končí jednou otázkou. Nejvýš 2 věty. Příklad stylu: „Ahoj dědo! Minule jsi mi začal vyprávět, jak jste s Pepou utekli na pouť do Prahy – tak jak to doma dopadlo?“
7. keyFacts: nejvýš 8 krátkých faktů (jména, roky, místa), která si má vnuk pamatovat.

Nic si nevymýšlej. Co v přepisu nezaznělo, neuváděj. Používej jen ID replik, která v přepisu existují.`;

export function buildSummarizerUser(input: { turns: Turn[]; openThreads: OpenThread[]; keyFacts: string[] }): string {
  const threads = input.openThreads.length
    ? input.openThreads.map((t) => `- ${t.id}: ${t.title} (${t.whyUnfinished})`).join("\n")
    : "Žádné.";
  const facts = input.keyFacts.length ? input.keyFacts.map((f) => `- ${f}`).join("\n") : "Žádná.";
  return `PŘEPIS DNEŠNÍHO POVÍDÁNÍ:\n${formatTranscript(input.turns)}\n\nNEDOVYPRÁVĚNÉ PŘÍBĚHY (ID: titulek):\n${threads}\n\nFAKTA, KTERÁ UŽ ZNÁME:\n${facts}`;
}
