// Deterministic person ↔ tree matching (PLAN §9). Pure, no I/O.
import type { FamilyTree, Match, PersonEntity, TreePerson } from "../types";
import { canonicalGiven } from "./diminutives";
import { jaroWinkler } from "./jaroWinkler";
import { normalize, surnameBase } from "./normalize";

export const STRONG = 0.85;
export const POSSIBLE = 0.65;
const ALSO_MIN = 0.3;
const W = { given: 0.35, surname: 0.3, year: 0.25, place: 0.1 } as const;

export interface Scored {
  treePersonId: string;
  score: number;
  raw: number;
  breakdown: Match["breakdown"];
  gates: string[];
  givenNote: string;
}

export function givenScore(mentionGiven: string, sex: "M" | "F" | null, cand: TreePerson): { score: number; note: string } {
  const mg = normalize(mentionGiven);
  if (!mg) return { score: 0, note: "" };
  if (cand.nickname && normalize(cand.nickname) === mg) return { score: 1, note: `${mentionGiven} = nickname` };
  if (normalize(cand.givenName) === mg) return { score: 1, note: `${mentionGiven} = ${cand.givenName}` };
  const m = canonicalGiven(mentionGiven, sex);
  const c = canonicalGiven(cand.givenName, cand.sex);
  const shared = m.canon.filter((x) => c.canon.includes(x));
  if (shared.length) {
    const score = m.canon.length === 1 ? 1 : 0.9;
    const note = m.isDiminutive ? `${mentionGiven} → ${cand.givenName} (diminutive)` : `${mentionGiven} ~ ${cand.givenName}`;
    return { score, note };
  }
  let best = 0;
  for (const a of m.canon) for (const b of c.canon) best = Math.max(best, jaroWinkler(a, b));
  return { score: best, note: `${mentionGiven} ≠ ${cand.givenName}` };
}

export function surnameScore(mentionSurname: string, cand: TreePerson): number {
  const base = surnameBase(mentionSurname);
  let best = 0;
  for (const s of [cand.surname, cand.birthSurname]) {
    if (!s) continue;
    const jw = jaroWinkler(base, surnameBase(s));
    best = Math.max(best, jw < 0.85 ? 0 : jw);
  }
  return best;
}

export function yearScore(mentionYear: number, approx: boolean, candYear: number): number {
  const d = Math.max(0, Math.abs(mentionYear - candYear) - (approx ? 2 : 0));
  if (d === 0) return 1;
  if (d <= 1) return 0.8;
  if (d <= 3) return 0.5;
  if (d <= 5) return 0.2;
  return 0;
}

export function placeScore(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.5;
  return 0;
}

/** Score one candidate. Returns null when a hard gate excludes it (sex mismatch). */
export function scoreCandidate(p: PersonEntity, cand: TreePerson): Scored | null {
  if (p.sex && p.sex !== cand.sex) return null;
  const given = p.givenName ? givenScore(p.givenName, p.sex, cand) : { score: 0, note: "" };
  const hasSurname = !!p.surname?.trim();
  const surname = hasSurname ? surnameScore(p.surname!, cand) : null;
  const year = p.birthYear != null && cand.birthYear != null ? yearScore(p.birthYear, p.birthYearApprox, cand.birthYear) : null;
  const place = p.place?.trim() && cand.birthPlace ? placeScore(p.place, cand.birthPlace) : null;

  let sum = W.given * given.score;
  let wsum = W.given;
  if (surname != null) { sum += W.surname * surname; wsum += W.surname; }
  if (year != null) { sum += W.year * year; wsum += W.year; }
  if (place != null) { sum += W.place * place; wsum += W.place; }
  const raw = sum / wsum;

  let score = raw;
  const gates: string[] = [];
  if (surname === 0) { score = Math.min(score, 0.5); gates.push("surname-mismatch-cap"); }
  if (p.birthYear != null && cand.birthYear != null && Math.abs(p.birthYear - cand.birthYear) > 10) {
    score = Math.min(score, 0.5); gates.push("year-gap-cap");
  }
  if (!hasSurname) { score = Math.min(score, 0.9); gates.push("no-surname-cap"); }

  return {
    treePersonId: cand.id,
    score: Math.round(score * 1000) / 1000,
    raw,
    breakdown: { given: round(given.score), surname: surname == null ? null : round(surname), year: year == null ? null : round(year), place: place == null ? null : round(place) },
    gates,
    givenNote: given.note,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** All non-excluded candidates for a person, best first. */
export function rankCandidates(p: PersonEntity, tree: FamilyTree, exclude: string[] = []): Scored[] {
  const out: Scored[] = [];
  for (const cand of tree.persons) {
    if (exclude.includes(cand.id)) continue;
    const s = scoreCandidate(p, cand);
    if (s) out.push(s);
  }
  return out.sort((a, b) => b.score - a.score || b.raw - a.raw);
}

function fullName(t: TreePerson) {
  return `${t.givenName} ${t.surname}`;
}

function buildReason(p: PersonEntity, cand: TreePerson, s: Scored): string {
  const parts: string[] = [];
  if (s.givenNote) parts.push(s.givenNote);
  if (p.surname) parts.push(s.breakdown.surname ? `${p.surname} = ${cand.surname}` : `${p.surname} ≠ ${cand.surname}`);
  if (p.birthYear != null && cand.birthYear != null) {
    parts.push(`${cand.birthYear} ≈ ${p.birthYearApprox ? "c. " : ""}${p.birthYear}`);
  }
  if (p.place && cand.birthPlace) parts.push(`${cand.birthPlace} ${s.breakdown.place ? "✓" : "✗"}`);
  return parts.join(" · ");
}

function whyNot(p: PersonEntity, cand: TreePerson, s: Scored): string {
  const bits: string[] = [];
  if (s.breakdown.surname === 0) bits.push("different surname");
  if (p.birthYear != null && cand.birthYear != null && p.birthYear !== cand.birthYear) {
    bits.push(`born ${Math.abs(p.birthYear - cand.birthYear)} years apart`);
  }
  if (s.breakdown.place === 0 && cand.birthPlace) bits.push(`different place (${cand.birthPlace})`);
  if (s.breakdown.given < 1) bits.push("different first name");
  return `${fullName(cand)}${cand.birthYear ? ` *${cand.birthYear}` : ""} – ${bits.length ? bits.join(", ") : "weaker match"}`;
}

export function matchId(entityId: string, treePersonId: string) {
  return `m-${entityId}-${treePersonId.toLowerCase()}`;
}

/**
 * Suggest top-1 tree matches for extracted persons.
 * Confirmed/rejected matches from `previous` are preserved; entities with a confirmed match get no new suggestion;
 * rejected (entity, treePerson) pairs are never suggested again; tree persons confirmed for another entity are skipped.
 */
export function suggestMatches(persons: PersonEntity[], tree: FamilyTree, exclude: string[], previous: Match[]): Match[] {
  const kept = previous.filter((m) => m.status !== "suggested");
  const confirmedEntities = new Set(kept.filter((m) => m.status === "confirmed").map((m) => m.entityId));
  const takenTree = new Set(kept.filter((m) => m.status === "confirmed").map((m) => m.treePersonId));
  const byId = new Map(tree.persons.map((t) => [t.id, t]));
  const out: Match[] = [...kept];

  for (const p of persons) {
    if (confirmedEntities.has(p.id)) continue;
    const rejected = new Set(kept.filter((m) => m.entityId === p.id && m.status === "rejected").map((m) => m.treePersonId));
    const ranked = rankCandidates(p, tree, exclude).filter((s) => !rejected.has(s.treePersonId) && !takenTree.has(s.treePersonId));
    const top = ranked[0];
    if (!top || top.score < POSSIBLE) continue;
    const cand = byId.get(top.treePersonId)!;
    out.push({
      id: matchId(p.id, cand.id),
      entityId: p.id,
      treePersonId: cand.id,
      score: top.score,
      breakdown: top.breakdown,
      gates: top.gates,
      band: top.score >= STRONG ? "strong" : "possible",
      reason: buildReason(p, cand, top),
      alsoConsidered: ranked
        .slice(1)
        .filter((s) => s.score > ALSO_MIN)
        .slice(0, 3)
        .map((s) => ({ treePersonId: s.treePersonId, score: s.score, why: whyNot(p, byId.get(s.treePersonId)!, s) })),
      status: "suggested",
    });
  }
  return out;
}
