import { describe, expect, it } from "vitest";
import { readGedcom } from "read-gedcom";
import tree from "@/data/fake-tree.json";
import type { Chapter, FamilyTree, Match, PersonEntity, Turn } from "@/lib/types";
import { buildGedcom, noteLines, type GedcomInput } from "@/lib/gedcom";

const pepa: PersonEntity = {
  id: "pepa", mentionName: "Pepa Dvořák", givenName: "Pepa", surname: "Dvořák", sex: "M", birthYear: 1948,
  birthYearApprox: true, place: "Kladno", relationToGrandparent: "childhood friend, neighbour", notes: "Lived next door.",
  turnIds: ["s1-t07"],
};
const anna: PersonEntity = { ...pepa, id: "anna", mentionName: "teta Anča", givenName: "Anča", surname: null, sex: "F", birthYear: 1930, relationToGrandparent: "aunt", turnIds: [] };
const turn: Turn = { id: "s1-t07", sessionId: "s1", idx: 7, clientSeq: 7, role: "grandparent", text: "Pepa Dvořák, ten bydlel o dům vedle, byl o dva roky mladší než já. E-mail pepa@kladno.cz", at: "2026-09-30T10:00:00Z" };
const longText = ("Dlouhý odstavec o dětství v Kladně, kde se všichni znali a chodili spolu do huti. ").repeat(12).trim();
const chapter: Chapter = {
  id: "ch1", key: "detstvi", title: "Dětství v Kladně", status: "draft", generatedAt: "2026-09-30T10:00:00Z", model: "x", openQuestions: [],
  paragraphs: [
    { id: "p1", text: longText, citations: [], verified: true, warnings: [], editedByFamily: false },
    { id: "p2", text: "", citations: [], verified: true, warnings: [], editedByFamily: false },
    { id: "p3", text: "Konec.", citations: [], verified: true, warnings: [], editedByFamily: false },
  ],
};
const confirmed: Match = {
  id: "m-pepa-i6", entityId: "pepa", treePersonId: "I6", score: 1, breakdown: { given: 1, surname: 1, year: 1, place: 1 },
  gates: [], band: "strong", reason: "", alsoConsidered: [], status: "confirmed",
};
const base: GedcomInput = {
  tree: tree as FamilyTree, matches: [], persons: [pepa, anna], turns: [turn], chapters: [chapter],
  grandparent: { id: "jaroslav", displayName: "Grandpa Jarda", fullName: "Jaroslav Novák", birthYear: 1946, birthPlace: "Kladno", sex: "M", treePersonId: "I1", grandchildName: "Tom" },
};

const lines = (g: string) => g.replace(/^﻿/, "").split("\r\n").filter((l, i, a) => !(i === a.length - 1 && l === ""));
const parse = (g: string) => readGedcom(new TextEncoder().encode(g).buffer as ArrayBuffer);

describe("noteLines", () => {
  it("splits on CONT/CONC, never next to space, escapes @", () => {
    const out = noteLines(0, `${longText}\n\nmail@x`);
    expect(out[0].length).toBeLessThanOrEqual(200);
    const conc = out.filter((l) => l.startsWith("1 CONC "));
    expect(conc.length).toBeGreaterThan(0);
    for (const l of conc) {
      const v = l.slice(7);
      expect(v.startsWith(" ")).toBe(false);
      expect(v.endsWith(" ")).toBe(false);
    }
    expect(out).toContain("1 CONT");
    expect(out.at(-1)).toBe("1 CONT mail@@x");
    // join back
    let text = out[0];
    for (const l of out.slice(1)) text += l.startsWith("1 CONT") ? "\n" + l.slice(7) : l.slice(7);
    expect(text).toBe(`${longText}\n\nmail@@x`);
  });
});

describe("buildGedcom", () => {
  const g = buildGedcom({ ...base, matches: [confirmed] }, { date: new Date(2026, 8, 30), includeUnmatched: true });
  const L = lines(g);

  it("format: BOM, CRLF, HEAD/TRLR, line length", () => {
    expect(g.startsWith("﻿0 HEAD\r\n")).toBe(true);
    expect(L[0]).toBe("0 HEAD");
    expect(L.at(-1)).toBe("0 TRLR");
    expect(g).toContain("1 DATE 30 SEP 2026");
    expect(g).not.toMatch(/[^\r]\n/);
    for (const l of L) expect(Buffer.byteLength(l, "utf8")).toBeLessThanOrEqual(255);
  });

  it("all xrefs used in FAM exist", () => {
    const defined = new Set(L.filter((l) => /^0 @[^@]+@ /.test(l)).map((l) => l.split(" ")[1]));
    const refs = L.filter((l) => /^1 (HUSB|WIFE|CHIL|FAMS|FAMC|NOTE @|SOUR @)/.test(l)).map((l) => l.split(" ")[2]);
    for (const r of refs) expect(defined.has(r)).toBe(true);
  });

  it("CONC values never start/end with space", () => {
    for (const l of L.filter((x) => / CONC /.test(x))) {
      const v = l.replace(/^\d+ CONC /, "");
      expect(v.startsWith(" ")).toBe(false);
      expect(v.endsWith(" ")).toBe(false);
    }
  });

  it("confirmed match adds NICK, NOTE, SOUR on I6", () => {
    const i6 = L.slice(L.indexOf("0 @I6@ INDI"), L.indexOf("0 @I7@ INDI"));
    expect(i6).toContain("2 NICK Pepa");
    expect(i6).toContain("1 SOUR @S1@");
    expect(i6).toContain("2 PAGE session 1, turn s1-t07");
    expect(g).toContain("In Grandpa Jaroslav's stories: Pepa Dvořák");
    expect(g).toContain("pepa@@kladno.cz");
    expect(L).toContain("2 TYPE maiden");
  });

  it("includeUnmatched adds X records", () => {
    expect(L).toContain("0 @X1@ INDI");
    expect(g).toContain("Mentioned in the stories: aunt. Unverified.");
    expect(L).toContain("2 DATE ABT 1930");
  });

  it("round-trips through read-gedcom", () => {
    const gc = parse(buildGedcom({ ...base, matches: [confirmed] }));
    expect(gc.getIndividualRecord().length).toBe(16);
    expect(gc.getFamilyRecord().length).toBe(8);
    const i6 = gc.getIndividualRecord("@I6@");
    expect(i6.getName().valueAsParts()[0]?.join(" ")).toContain("Dvořák");
    const texts = gc.getNoteRecord().value().map((v) => v ?? "");
    expect(i6.getNote().value()[0]).toMatch(/^@N\d+@$/);
    expect(texts.join("\n")).toContain("Pepa");
    const i5names = gc.getIndividualRecord("@I5@").getName().valueAsParts().flat().join(" ");
    expect(i5names).toContain("Dvořáková");
  });

  it("without matches has 16 INDI / 8 FAM and no X records", () => {
    const g2 = buildGedcom(base);
    const gc = parse(g2);
    expect(gc.getIndividualRecord().length).toBe(16);
    expect(gc.getFamilyRecord().length).toBe(8);
    expect(g2).not.toContain("@X1@");
  });
});
