import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { DbSchema } from "@/lib/schemas";
import { buildMemory } from "@/lib/memory";
import type { Db } from "@/lib/types";
import { validateParagraph } from "@/lib/chapters";
import { suggestMatches } from "@/lib/matching/match";

function load(name: string): Db {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data", "snapshots", `${name}.json`), "utf8")) as Db;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Capitalized words that are not at the start of a sentence (= proper names). */
function properNames(text: string): string[] {
  const out: string[] = [];
  const re = /(^|[.!?…]\s+|\s)(\p{Lu}\p{Ll}+)/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const sentenceStart = m.index === 0 || /[.!?…]\s+$/.test(m[1]) || m[1] === "";
    if (!sentenceStart) out.push(m[2]);
  }
  return out;
}

const SNAPSHOTS = ["empty", "after-s1", "after-s2"];

describe.each(SNAPSHOTS)("snapshot %s", (name) => {
  const db = load(name);

  it("validates against DbSchema", () => {
    const r = DbSchema.safeParse(db);
    if (!r.success) console.error(r.error.issues.slice(0, 5));
    expect(r.success).toBe(true);
  });

  it("all referenced turnIds exist", () => {
    const ids = new Set(db.turns.map((t) => t.id));
    const refs = [
      ...db.threads.flatMap((t) => t.turnIds),
      ...db.summaries.flatMap((s) => s.newOpenThreads.flatMap((t) => t.turnIds)),
      ...db.persons.flatMap((p) => p.turnIds),
      ...db.places.flatMap((p) => p.turnIds),
      ...db.events.flatMap((e) => e.turnIds),
      ...db.chapters.flatMap((c) => c.paragraphs.flatMap((p) => p.citations.map((x) => x.turnId))),
    ];
    for (const r of refs) expect(ids.has(r), `missing turn ${r}`).toBe(true);
  });

  it("turn ids/idx are consistent and unique", () => {
    const ids = db.turns.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of db.turns) expect(t.id).toBe(`${t.sessionId}-t${String(t.idx).padStart(2, "0")}`);
  });

  it("entity/thread/match cross references exist", () => {
    const personIds = new Set(db.persons.map((p) => p.id));
    const placeIds = new Set(db.places.map((p) => p.id));
    const treeIds = new Set(db.tree.persons.map((p) => p.id));
    const threadIds = new Set(db.threads.map((t) => t.id));
    for (const e of db.events) {
      e.personIds.forEach((id) => expect(personIds.has(id)).toBe(true));
      e.placeIds.forEach((id) => expect(placeIds.has(id)).toBe(true));
    }
    for (const m of db.matches) {
      expect(personIds.has(m.entityId)).toBe(true);
      expect(treeIds.has(m.treePersonId)).toBe(true);
      m.alsoConsidered.forEach((a) => expect(treeIds.has(a.treePersonId)).toBe(true));
    }
    for (const s of db.summaries) s.resolvedThreadIds.forEach((id) => expect(threadIds.has(id)).toBe(true));
    for (const s of db.sessions) if (s.continuedThreadId) expect(threadIds.has(s.continuedThreadId)).toBe(true);
  });

  it("first AI turn of each session equals session.firstMessage", () => {
    for (const s of db.sessions) {
      const first = db.turns.filter((t) => t.sessionId === s.id).sort((a, b) => a.idx - b.idx)[0];
      expect(first?.role).toBe("ai");
      expect(first?.text).toBe(s.firstMessage);
    }
  });

  it("chapter citations are grandparent turns and years/names are grounded", () => {
    const byId = new Map(db.turns.map((t) => [t.id, t]));
    for (const ch of db.chapters) {
      for (const p of ch.paragraphs) {
        expect(p.citations.length).toBeGreaterThan(0);
        for (const c of p.citations) {
          const t = byId.get(c.turnId)!;
          expect(t.role, `${c.turnId} must be grandparent`).toBe("grandparent");
          expect(t.text.startsWith(c.quote)).toBe(true);
        }
        if (!p.verified) continue;
        const cited = p.citations.map((c) => byId.get(c.turnId)!.text).join(" ");
        for (const y of p.text.match(/\b1[89]\d\d\b|\b20\d\d\b/g) ?? []) {
          expect(cited.includes(y), `year ${y} not in cited turns (${p.id})`).toBe(true);
        }
        const citedNorm = norm(cited);
        for (const n of properNames(p.text)) {
          const stem = norm(n).slice(0, 4);
          expect(citedNorm.includes(stem), `name ${n} not in cited turns (${p.id})`).toBe(true);
        }
      }
    }
  });
});

describe("demo content specifics", () => {
  it("after-s1: fair thread open, Pepa suggested → I6, opener about the fair", () => {
    const db = load("after-s1");
    expect(db.turns.filter((t) => t.sessionId === "s1").length).toBeGreaterThanOrEqual(18);
    expect(db.threads.find((t) => t.id === "th-pout")?.resolvedInSession).toBeNull();
    const pepa = db.persons.find((p) => p.givenName === "Pepa")!;
    expect(pepa).toMatchObject({ surname: "Walker", sex: "M", birthYear: 1948, birthYearApprox: true, place: "Kladno" });
    expect(db.matches).toHaveLength(1);
    expect(db.matches[0]).toMatchObject({ entityId: pepa.id, treePersonId: "I6", status: "suggested" });
    expect(db.tree.persons).toHaveLength(16);
    expect(db.tree.families).toHaveLength(8);
    expect(buildMemory(db).firstMessage).toContain("fair in Prague");
  });

  it("after-s2: fair resolved, military service open, chapter detstvi, match still suggested, s2 continued the fair", () => {
    const db = load("after-s2");
    expect(db.threads.find((t) => t.id === "th-pout")?.resolvedInSession).toBe("s2");
    expect(db.threads.find((t) => t.id === "th-vojna")?.resolvedInSession).toBeNull();
    const ch = db.chapters.find((c) => c.key === "detstvi")!;
    expect(ch.title).toBe("The Boy from the Poldi Chimneys");
    expect(ch.paragraphs.length).toBeGreaterThanOrEqual(4);
    expect(ch.paragraphs.every((p) => p.verified)).toBe(true);
    expect(db.matches[0].status).toBe("suggested");
    const s1 = load("after-s1");
    expect(db.sessions.find((s) => s.id === "s2")?.firstMessage).toBe(s1.summaries[0].nextSessionOpener);
    expect(db.sessions.find((s) => s.id === "s2")?.continuedThreadId).toBe("th-pout");
    expect(buildMemory(db).firstMessage).toContain("Jihlava");
  });

  it("tree embedded verbatim from data/fake-tree.json", () => {
    const tree = JSON.parse(readFileSync(path.join(process.cwd(), "data", "fake-tree.json"), "utf8"));
    expect(load("after-s1").tree).toEqual(tree);
    expect(load("after-s2").tree).toEqual(tree);
  });
});

describe("cross-check with WP2/WP3 implementations", () => {
  it("chapter paragraphs pass lib/chapters validateParagraph", () => {
    const db = load("after-s2");
    const byId = new Map(db.turns.map((t) => [t.id, t]));
    for (const p of db.chapters.flatMap((c) => c.paragraphs)) {
      expect(validateParagraph(p.text, p.citations, byId), p.id).toEqual({ verified: true, warnings: [] });
    }
  });

  it("suggestMatches over after-s1 suggests Pepa → I6 with the same id as the snapshot", () => {
    const db = load("after-s1");
    const out = suggestMatches(db.persons, db.tree, [db.grandparent.treePersonId, "I10"], []);
    const pepa = out.find((m) => m.entityId === "p-pepa")!;
    expect(pepa).toMatchObject({ id: db.matches[0].id, treePersonId: "I6", band: "strong", status: "suggested" });
  });
});
