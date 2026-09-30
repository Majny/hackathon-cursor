// WP2 smoke test: summary + extract + chapter on the seed transcript, on OpenAI and then Gemini.
// Run: npx tsx --env-file=.env.local scripts/smoke-llm.ts   (optional arg: "openai" | "gemini")
import { promises as fs } from "fs";
import path from "path";
import type { Db, Turn } from "../lib/types";
import { analyzeSession } from "../lib/pipeline";
import { draftChapter } from "../lib/chapters";
import { mergeEntities } from "../lib/entities";
import { turnId } from "../lib/ids";

async function seedDb(): Promise<Db> {
  const empty = JSON.parse(await fs.readFile(path.join(process.cwd(), "data/snapshots/empty.json"), "utf8")) as Db;
  const seed = JSON.parse(await fs.readFile(path.join(process.cwd(), "data/fixtures/seed-s1.json"), "utf8")) as {
    firstMessage: string; turns: [Turn["role"], string][];
  };
  const at = new Date().toISOString();
  empty.sessions = [{
    id: "s1", grandparentId: empty.grandparent.id, index: 1, startedAt: at, endedAt: at, mode: "voice",
    status: "live", elConversationId: null, firstMessage: seed.firstMessage, continuedThreadId: null,
  }];
  empty.turns = seed.turns.map(([role, text], i) => ({
    id: turnId("s1", i + 1), sessionId: "s1", idx: i + 1, clientSeq: i + 1, role, text, at,
  }));
  return empty;
}

function check(label: string, ok: boolean, extra = ""): boolean {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  (${extra})` : ""}`);
  return ok;
}

async function run(provider: "openai" | "gemini"): Promise<boolean> {
  process.env.LLM_PROVIDER = provider;
  console.log(`\n=== provider ${provider} ===`);
  const db = await seedDb();
  const t0 = Date.now();
  const { summary, extraction, timings } = await analyzeSession(db, "s1");
  console.log(`  summary ${timings.summaryMs} ms, extract ${timings.extractMs} ms, finalize LLM total ${timings.totalMs} ms via ${timings.providers.join(", ")}`);
  let ok = true;
  ok = check("finalize < 25 s", timings.totalMs < 25_000, `${timings.totalMs} ms`) && ok;
  ok = check("used requested provider", timings.providers.every((p) => p.startsWith(provider)), timings.providers.join(",")) && ok;
  console.log(`  summary: ${summary.summary}`);
  console.log(`  opener: ${summary.nextSessionOpener}`);
  const pout = summary.newOpenThreads.find((t) => /pou[tť]/i.test(t.title + t.whyUnfinished));
  ok = check("open thread about pouť", !!pout, pout?.title) && ok;
  ok = check("topicsCovered has detstvi", summary.topicsCovered.includes("detstvi"), summary.topicsCovered.join(",")) && ok;

  const pepa = extraction.persons.find((p) => /pep/i.test(p.mentionName + (p.givenName ?? "")));
  ok = check("Pepa extracted", !!pepa, pepa ? JSON.stringify({ g: pepa.givenName, s: pepa.surname, y: pepa.birthYear, a: pepa.birthYearApprox, p: pepa.place }) : "") && ok;
  ok = check("Pepa birthYear 1948 approx", pepa?.birthYear === 1948 && pepa?.birthYearApprox === true) && ok;
  ok = check("Pepa place Kladno", /kladn/i.test(pepa?.place ?? "")) && ok;
  const merged = mergeEntities({ persons: [], places: [], events: [] }, extraction, new Set(db.turns.map((t) => t.id)));
  console.log(`  entities: ${merged.persons.length} persons, ${merged.places.length} places, ${merged.events.length} events`);

  db.summaries = [{ ...summary, sessionId: "s1" }];
  const { chapter, ms, provider: chProv } = await draftChapter(db, "detstvi");
  console.log(`  chapter ${ms} ms via ${chProv}:${chapter.model} – „${chapter.title}“, ${chapter.paragraphs.length} paragraphs`);
  ok = check("every paragraph has a citation", chapter.paragraphs.every((p) => p.citations.length > 0)) && ok;
  const unverified = chapter.paragraphs.filter((p) => !p.verified);
  check("all paragraphs verified (soft)", unverified.length === 0, unverified.flatMap((p) => p.warnings).join(" | "));
  console.log(`  total ${Date.now() - t0} ms`);
  return ok;
}

async function main() {
  const only = process.argv[2] as "openai" | "gemini" | undefined;
  const providers = only ? [only] : (["openai", "gemini"] as const);
  let allOk = true;
  for (const p of providers) {
    try {
      allOk = (await run(p)) && allOk;
    } catch (e) {
      allOk = false;
      console.error(`  ERROR (${p}):`, (e as Error).message);
    }
  }
  console.log(allOk ? "\nSMOKE OK" : "\nSMOKE HAD FAILURES");
  process.exit(allOk ? 0 : 1);
}
main();
