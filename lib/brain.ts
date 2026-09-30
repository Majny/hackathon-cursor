import type { Entity, Message } from "./store";
import { newId } from "./store";

const PLACE_WORDS =
  /\b(Kladno|Praha|Prague|Brno|Plzeň|Pilsen|Ostrava|Liberec|Bratislava|Vienna|Vienna|Vienna)\b/gi;

const YEAR_RE = /\b(19\d{2}|20\d{2})\b/g;

const PERSON_HINTS =
  /\b(?:my friend|friend|buddy|colleague|neighbor|mate)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b|\b([A-Z][a-z]+)\s+from\s+([A-Z][a-z]+)\b|\b(Pepa|Josef|Joseph|Marie|Anna|Karel|Helena|František|Václav|Petr|Jan)\b/g;

export function extractEntities(transcript: string): Entity[] {
  const entities: Entity[] = [];
  const seen = new Set<string>();

  const push = (e: Omit<Entity, "id">) => {
    const key = `${e.kind}:${e.name.toLowerCase()}:${e.place ?? ""}:${e.year ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push({ id: newId("ent"), ...e });
  };

  // Pepa + Kladno + 1948 pattern (common demo utterance)
  const pepa = transcript.match(/\b(Pepa|Josef|Joseph)\b/i);
  const kladno = /\bKladno\b/i.test(transcript);
  const y1948 = /\b1948\b/.test(transcript);
  if (pepa) {
    push({
      kind: "person",
      name: pepa[1],
      place: kladno ? "Kladno" : undefined,
      year: y1948 ? 1948 : undefined,
      notes: "Extracted from transcript",
    });
  }

  let m: RegExpExecArray | null;
  const personRe = new RegExp(PERSON_HINTS.source, "gi");
  while ((m = personRe.exec(transcript))) {
    const name = (m[1] || m[2] || m[4] || "").trim();
    const place = (m[3] || "").trim() || undefined;
    if (!name || name.length < 3) continue;
    if (/^(When|Then|After|Before|There|This|That|What|Where)$/i.test(name)) continue;
    push({ kind: "person", name, place, notes: "Mentioned in story" });
  }

  const places = transcript.match(PLACE_WORDS) || [];
  for (const p of places) {
    push({ kind: "place", name: p });
  }

  const years = transcript.match(YEAR_RE) || [];
  for (const y of years) {
    push({
      kind: "event",
      name: `Around ${y}`,
      year: Number(y),
      notes: "Year mentioned in transcript",
    });
  }

  return entities;
}

export function buildChapter(messages: Message[], sessionIds: string[]) {
  const userBits = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);

  const body =
    userBits.length === 0
      ? "No stories recorded yet."
      : [
          "This chapter is written only from what was said in the recorded sessions.",
          "",
          ...userBits.map((t, i) => `In their own words (${i + 1}):\n${t}`),
        ].join("\n\n");

  return {
    title: "Childhood and early friends",
    body,
    sourceSessionIds: sessionIds,
    createdAt: new Date().toISOString(),
  };
}

export function summarizeSession(messages: Message[]): {
  summary: string;
  openThreads: string[];
} {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  const topics: string[] = [];
  if (/army|military|soldier|war/i.test(userText)) topics.push("army / military service");
  if (/wedding|married|wife|husband|love/i.test(userText)) topics.push("wedding / marriage");
  if (/child|school|childhood|grew up/i.test(userText)) topics.push("childhood");
  if (/work|factory|job|steel/i.test(userText)) topics.push("work");
  if (/Pepa|friend|Kladno/i.test(userText)) topics.push("friend Pepa from Kladno");

  const openThreads =
    topics.length > 0
      ? topics.map((t) => `Ask more about ${t}`)
      : ["Ask what happened next in the story they started"];

  const summary =
    userText.slice(0, 280) ||
    "Short session with little detail yet.";

  return { summary, openThreads };
}

export function heuristicFollowUp(
  userText: string,
  openThreads: string[],
  priorSummary: string | null
): string {
  if (/\bPepa\b/i.test(userText) && !/\b1948\b/.test(userText)) {
    return "Thank you for telling me about Pepa. Do you remember about what year he was born, or how old he was when you met?";
  }
  if (/\bPepa\b/i.test(userText) && !/\bKladno\b/i.test(userText)) {
    return "Pepa sounds important. Where did you two meet — was it in your hometown or somewhere else?";
  }
  if (/\bKladno\b/i.test(userText) && /\bPepa\b/i.test(userText)) {
    return "Kladno and Pepa — I can almost picture it. What did you two do together back then?";
  }
  if (/child|school|grew up|childhood/i.test(userText)) {
    return "That sounds like a vivid childhood memory. Who else was there with you, and what happened next?";
  }
  if (openThreads[0]) {
    return `Last time we left a thread open: ${openThreads[0].replace(/^Ask more about /i, "")}. Can you tell me a little more about that?`;
  }
  if (priorSummary) {
    return `I still remember what you shared before. What happened after that?`;
  }
  return "I'm listening. What happened next — and who else was part of that moment?";
}

export const GRANDCHILD_SYSTEM = `You are a patient, curious grandchild interviewing your grandparent about their life.
Rules:
- Speak English, warm and simple.
- Ask exactly ONE short follow-up question.
- Ask for names, places, years, and feelings when missing.
- Never invent facts they did not say.
- Keep replies under 60 words.`;
