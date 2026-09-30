import { describe, expect, it } from "vitest";
import tree from "@/data/fake-tree.json";
import type { FamilyTree, Match, PersonEntity } from "@/lib/types";
import { rankCandidates, scoreCandidate, suggestMatches, givenScore, surnameScore } from "@/lib/matching/match";
import { jaroWinkler } from "@/lib/matching/jaroWinkler";
import { canonicalGiven } from "@/lib/matching/diminutives";
import { normalize, surnameBase } from "@/lib/matching/normalize";

const T = tree as FamilyTree;
const person = (over: Partial<PersonEntity> = {}): PersonEntity => ({
  id: "p-pepa", mentionName: "Pepa Dvořák", givenName: "Pepa", surname: "Dvořák", sex: "M",
  birthYear: 1948, birthYearApprox: true, place: "Kladno", relationToGrandparent: "kamarád ze sousedství",
  notes: "", turnIds: ["s1-t07"], ...over,
});
const cand = (id: string) => T.persons.find((p) => p.id === id)!;
const EXCLUDE = ["I1", "I10"];

describe("fake tree", () => {
  it("has 16 persons and 8 families", () => {
    expect(T.persons).toHaveLength(16);
    expect(T.families).toHaveLength(8);
  });
});

describe("helpers", () => {
  it("normalizes", () => {
    expect(normalize("  Dvořák   Josef ")).toBe("dvorak josef");
    expect(surnameBase("Nováková")).toBe("novak");
    expect(surnameBase("Černá")).toBe("cerny");
  });
  it("jaro-winkler", () => {
    expect(jaroWinkler("martha", "marhta")).toBeCloseTo(0.961, 3);
    expect(jaroWinkler("dvorak", "horak")).toBeLessThan(0.85);
    expect(jaroWinkler("dvorak", "novak")).toBeLessThan(0.85);
  });
  it("diminutives", () => {
    expect(canonicalGiven("Honza", "M").canon).toEqual(["jan"]);
    expect(canonicalGiven("Jožka", "F").canon).toEqual(["josefa"]);
    expect(canonicalGiven("Jožka", "M").canon).toEqual(["josef"]);
    expect(canonicalGiven("Pepa", "M").isDiminutive).toBe(true);
    expect(givenScore("Honza", "M", cand("I8")).score).toBe(1);
  });
  it("Nováková ~ Novák", () => {
    expect(surnameScore("Nováková", cand("I1"))).toBe(1);
  });
});

describe("Pepa Dvořák", () => {
  const ranked = rankCandidates(person(), T, EXCLUDE);
  const get = (id: string) => ranked.find((r) => r.treePersonId === id)!;

  it("I6 Josef Dvořák is strong top match", () => {
    expect(ranked[0].treePersonId).toBe("I6");
    expect(get("I6").score).toBeGreaterThanOrEqual(0.95);
    expect(get("I6").breakdown).toEqual({ given: 1, surname: 1, year: 1, place: 1 });
  });
  it("I12 Josef Novák decoy ≤ 0.45 with both caps", () => {
    expect(get("I12").score).toBeLessThanOrEqual(0.45);
    expect(get("I12").gates).toEqual(expect.arrayContaining(["surname-mismatch-cap", "year-gap-cap"]));
  });
  it("I13 Josef Horák decoy ≤ 0.5", () => {
    expect(get("I13").score).toBeLessThanOrEqual(0.5);
    expect(get("I13").gates).toContain("surname-mismatch-cap");
  });
  it("suggestMatches proposes only I6", () => {
    const ms = suggestMatches([person()], T, EXCLUDE, []);
    expect(ms).toHaveLength(1);
    expect(ms[0]).toMatchObject({ treePersonId: "I6", band: "strong", status: "suggested" });
    expect(ms[0].reason).toContain("Pepa → Josef (zdrobnělina)");
    expect(ms[0].alsoConsidered.map((a) => a.treePersonId)).toContain("I12");
    expect(ms[0].alsoConsidered.find((a) => a.treePersonId === "I12")!.why).toContain("jiné příjmení");
  });
});

describe("gates", () => {
  it("different sex excludes", () => {
    expect(scoreCandidate(person({ sex: "F" }), cand("I6"))).toBeNull();
    expect(rankCandidates(person({ sex: "F" }), T, EXCLUDE).some((r) => r.treePersonId === "I6")).toBe(false);
  });
  it("exclude list excludes", () => {
    const r = rankCandidates(person({ givenName: "Jarda", surname: "Novák", birthYear: 1946 }), T, EXCLUDE);
    expect(r.some((x) => x.treePersonId === "I1")).toBe(false);
  });
  it("no surname caps at 0.9", () => {
    const s = scoreCandidate(person({ surname: null }), cand("I6"))!;
    expect(s.score).toBeLessThanOrEqual(0.9);
    expect(s.gates).toContain("no-surname-cap");
    expect(s.breakdown.surname).toBeNull();
  });
});

describe("previous decisions", () => {
  it("keeps confirmed and does not re-suggest", () => {
    const [m] = suggestMatches([person()], T, EXCLUDE, []);
    const confirmed: Match = { ...m, status: "confirmed" };
    const again = suggestMatches([person()], T, EXCLUDE, [confirmed]);
    expect(again).toEqual([confirmed]);
  });
  it("rejected pair is not suggested again", () => {
    const [m] = suggestMatches([person()], T, EXCLUDE, []);
    const rejected: Match = { ...m, status: "rejected" };
    const again = suggestMatches([person()], T, EXCLUDE, [rejected]);
    expect(again.filter((x) => x.status === "suggested" && x.treePersonId === "I6")).toHaveLength(0);
    expect(again).toContainEqual(rejected);
  });
});
