import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import type { Db } from "@/lib/types";
import {
  buildSearchIndex,
  entityLinkTerms,
  formatYear,
  getConversation,
  getConversations,
  getOverview,
  getPeople,
  getPersonProfile,
  getPlaceProfile,
  getPlaces,
  getTimeline,
  linkEntities,
  normalizeSearch,
  quoteForTurn,
  searchDocs,
  snippetFor,
} from "@/lib/archive";

const load = (n: string): Db => JSON.parse(readFileSync(path.join(process.cwd(), "data", "snapshots", `${n}.json`), "utf8")) as Db;
const db = load("after-s2");

describe("archive helpers", () => {
  it("formats years and normalises diacritics", () => {
    expect(formatYear(1948, true)).toBe("c. 1948");
    expect(formatYear(null)).toBe("Year unknown");
    expect(normalizeSearch("Vera Miller")).toBe("verka novak");
  });
  it("quoteForTurn links to the conversation anchor", () => {
    const q = quoteForTurn(db, "s1-t02")!;
    expect(q.href).toBe("/family/conversations/s1#s1-t02");
    expect(q.sessionIndex).toBe(1);
    expect(q.role).toBe("grandparent");
    expect(q.quote.length).toBeLessThanOrEqual(161);
  });
});

describe("people & places", () => {
  it("Pepa profile has a suggested match to I6 and quotes", () => {
    const p = getPersonProfile(db, "p-pepa")!;
    expect(p.match?.treePersonId).toBe("I6");
    expect(p.treeStatus).toBe("suggested");
    expect(p.quotes.length).toBeGreaterThan(0);
    expect(p.quotes[0].role).toBe("grandparent");
    expect(p.events.some((e) => e.id === "ev-pout")).toBe(true);
    expect(p.chapterRefs.length).toBeGreaterThan(0);
    expect(p.initials).toBe("PD");
  });
  it("family members without matches are inferred through the tree", () => {
    const anna = getPersonProfile(db, "p-anna")!;
    expect(anna.treeStatus).toBe("inferred");
    expect(anna.treePerson?.id).toBe("I4");
    expect(getPersonProfile(db, "p-frantisek")!.treePerson?.id).toBe("I3");
    expect(getPersonProfile(db, "p-vera")!.treePerson?.id).toBe("I5");
  });
  it("lists people and places", () => {
    expect(getPeople(db)[0].id).toBe("p-pepa");
    expect(getPlaces(db)).toHaveLength(4);
    const praha = getPlaceProfile(db, "pl-praha")!;
    expect(praha.events.map((e) => e.id)).toContain("ev-pout");
    expect(getPersonProfile(db, "nope")).toBeNull();
  });
});

describe("timeline", () => {
  const tl = getTimeline(db);
  it("is sorted and contains birth + fair", () => {
    const years = tl.items.map((i) => i.year ?? 0);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(tl.items[0].year).toBe(1946);
    const fair = tl.items.find((i) => i.id === "ev-pout")!;
    expect(fair.age).toBe(12);
  });
  it("dates Pepa's wedding from the tree", () => {
    const w = tl.items.find((i) => i.id === "ev-svatba-vera");
    expect(w?.year).toBe(1972);
    expect(w?.approx).toBe(true);
  });
  it("has stages and decades", () => {
    expect(tl.stages[0].label).toBe("Childhood");
    expect(tl.decades[0]).toBe(1950);
  });
});

describe("conversations & overview", () => {
  it("lists conversations newest first", () => {
    const c = getConversations(db);
    expect(c.map((x) => x.id)).toEqual(["s2", "s1"]);
    expect(c[0].continuedThread?.id).toBe("th-pout");
    expect(c[0].channel).toBe("WhatsApp call");
  });
  it("conversation detail exposes turns with backlinks", () => {
    const c = getConversation(db, "s1")!;
    expect(c.turns).toHaveLength(20);
    expect(c.turns.find((t) => t.turnId === "s1-t02")!.chapterRefs.length).toBeGreaterThan(0);
  });
  it("overview has next call topic and stats", () => {
    const o = getOverview(db);
    expect(o.stats.conversations).toBe(2);
    expect(o.stats.people).toBe(4);
    expect(o.openThreads.map((t) => t.thread.id)).toEqual(["th-vojna"]);
    expect(o.nextCall?.topic).toMatch(/Jihlava/);
    expect(o.latestChapter?.verified).toBe(5);
    expect(o.pendingMatches).toHaveLength(1);
    expect(o.featuredQuote).not.toBeNull();
  });
});

describe("search", () => {
  const idx = buildSearchIndex(db);
  it("finds Pepa and the fair", () => {
    expect(searchDocs(idx, "Pepa")[0].id).toBe("person:p-pepa");
    expect(searchDocs(idx, "fair").some((h) => h.kind === "event")).toBe(true);
  });
  it("is diacritic-insensitive", () => {
    expect(searchDocs(idx, "verka").some((h) => h.id === "person:p-vera")).toBe(true);
  });
  it("builds snippets on accented text", () => {
    const s = snippetFor("sister Vera was small", "verka")!;
    expect(s.match).toBe("Vera");
  });
});

describe("auto-linking", () => {
  it("wraps entity names", () => {
    const parts = linkEntities("Pepa and I went to Prague.", entityLinkTerms(db));
    expect(parts.filter((p) => p.link).map((p) => p.text)).toEqual(["Pepa", "Prague"]);
  });
});
