import fakeTree from "@/data/fake-tree.json";
import type { Entity, MatchProposal } from "./store";

export type TreePerson = {
  id: string;
  givenName: string;
  surname: string;
  nicknames: string[];
  birthYear: number;
  place: string;
  notes: string;
};

const NICK_MAP: Record<string, string[]> = {
  pepa: ["josef", "joseph", "pepík", "pepa"],
  josef: ["pepa", "joseph", "pepík"],
  joseph: ["josef", "pepa"],
  marie: ["máňa", "maria"],
  jan: ["honza", "johnny"],
  františek: ["franta", "frank"],
  václav: ["vašek", "wenceslas"],
};

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function nameHit(entityName: string, person: TreePerson): { hit: boolean; reason?: string } {
  const n = norm(entityName);
  const given = norm(person.givenName);
  const sur = norm(person.surname);
  const full = `${given} ${sur}`;
  const nicks = person.nicknames.map(norm);

  if (n === given || n === full || nicks.includes(n)) {
    return { hit: true, reason: `name matches ${person.givenName}` };
  }

  const aliases = NICK_MAP[n] || [];
  if (aliases.includes(given) || nicks.some((x) => aliases.includes(x))) {
    return { hit: true, reason: `nickname ${entityName} ↔ ${person.givenName}` };
  }

  if (n.includes(given) || given.includes(n)) {
    return { hit: true, reason: `partial name match` };
  }

  return { hit: false };
}

export function getFakeTree(): TreePerson[] {
  return fakeTree as TreePerson[];
}

export function matchEntityToTree(entity: Entity): MatchProposal | null {
  if (entity.kind !== "person") return null;

  let best: { person: TreePerson; score: number; reasons: string[] } | null = null;

  for (const person of getFakeTree()) {
    let score = 0;
    const reasons: string[] = [];
    const nh = nameHit(entity.name, person);
    if (!nh.hit) continue;
    score += 40;
    if (nh.reason) reasons.push(nh.reason);

    if (entity.place && norm(entity.place) === norm(person.place)) {
      score += 35;
      reasons.push(`same place: ${person.place}`);
    }

    if (entity.year && entity.year === person.birthYear) {
      score += 25;
      reasons.push(`same year: ${person.birthYear}`);
    }

    if (!best || score > best.score) {
      best = { person, score, reasons };
    }
  }

  if (!best || best.score < 50) return null;

  return {
    entityId: entity.id,
    treePersonId: best.person.id,
    score: best.score,
    reasons: best.reasons,
    status: "proposed",
  };
}

export function matchAll(entities: Entity[]): MatchProposal[] {
  const out: MatchProposal[] = [];
  for (const e of entities) {
    const m = matchEntityToTree(e);
    if (m) out.push(m);
  }
  return out;
}

export function toGedcom(opts: {
  subjectName: string;
  chapterBody: string;
  confirmed: { entity: Entity; person: TreePerson }[];
}): string {
  const lines = [
    "0 HEAD",
    "1 SOUR And Then",
    "1 GEDC",
    "2 VERS 5.5.1",
    "1 CHAR UTF-8",
    "0 @I1@ INDI",
    `1 NAME ${opts.subjectName.replace(/ /g, " /")}/`,
    "1 NOTE " + opts.chapterBody.replace(/\n/g, " ").slice(0, 400),
  ];

  opts.confirmed.forEach((c, i) => {
    const id = `@I${i + 2}@`;
    lines.push(`0 ${id} INDI`);
    lines.push(`1 NAME ${c.person.givenName} /${c.person.surname}/`);
    lines.push(`1 BIRT`);
    lines.push(`2 DATE ${c.person.birthYear}`);
    lines.push(`2 PLAC ${c.person.place}`);
    lines.push(`1 NOTE Linked from story mention: ${c.entity.name}`);
    lines.push(`0 @A${i + 1}@ ASSO`);
    lines.push(`1 INDI @I1@`);
    lines.push(`1 RELA friend`);
  });

  lines.push("0 TRLR");
  return lines.join("\n");
}
