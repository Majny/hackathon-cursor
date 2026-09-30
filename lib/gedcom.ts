// GEDCOM 5.5.1 writer (PLAN §10). Pure, no I/O.
import type { Db, TreePerson } from "./types";

export type GedcomInput = Pick<Db, "tree" | "matches" | "persons" | "turns" | "chapters" | "grandparent">;
export interface GedcomOptions { includeUnmatched?: boolean; date?: Date }

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Split text into NOTE value + CONT/CONC lines.
 * out[0] = value for the "<level> NOTE" line; rest are full "<level+1> CONT|CONC ..." lines.
 */
export function noteLines(level: number, text: string, max = 200): string[] {
  const out: string[] = [];
  text.replace(/\r\n?/g, "\n").split("\n").forEach((rawPara, pi) => {
    let para = rawPara.replace(/@/g, "@@");
    const chunks: string[] = [];
    while (para.length > max) {
      let cut = max;
      // CONC rule: never split next to a space
      while (cut > 1 && (para[cut - 1] === " " || para[cut] === " ")) cut--;
      if (cut <= 1) cut = max; // pathological all-space text
      chunks.push(para.slice(0, cut));
      para = para.slice(cut);
    }
    chunks.push(para);
    chunks.forEach((c, ci) => {
      if (pi === 0 && ci === 0) out.push(c);
      else out.push(`${level + 1} ${ci === 0 ? "CONT" : "CONC"}${c ? " " + c : ""}`);
    });
  });
  return out;
}

/** Emit "<level> TAG value" with NOTE-style continuation. `head` is e.g. "0 @N1@ NOTE" or "1 NOTE". */
function noteRecord(head: string, level: number, text: string): string[] {
  const [first, ...rest] = noteLines(level, text);
  return [first ? `${head} ${first}` : head, ...rest];
}

const clean = (s: string) => s.replace(/[\r\n]+/g, " ").replace(/@/g, "@@").trim();

function gedDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function sessionNo(turnId: string) {
  const m = /^s(\d+)-/.exec(turnId);
  return m ? m[1] : "?";
}

export function buildGedcom(db: GedcomInput, opts: GedcomOptions = {}): string {
  const L: string[] = [];
  const { tree } = db;
  const gp = db.grandparent;
  const gpGiven = gp.fullName.split(" ")[0] ?? gp.fullName;
  const turns = new Map(db.turns.map((t) => [t.id, t]));
  const entities = new Map(db.persons.map((p) => [p.id, p]));

  // HEAD + SUBM
  L.push("0 HEAD", "1 SOUR HEIRLOOM", "2 VERS 0.1", "2 NAME Heirloom");
  L.push(`1 DATE ${gedDate(opts.date ?? new Date())}`, "1 SUBM @U1@", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED");
  L.push("1 CHAR UTF-8", "1 LANG English");
  const surnameForSubm = gp.fullName.split(" ").slice(1).join(" ") || gp.fullName;
  L.push("0 @U1@ SUBM", `1 NAME The ${clean(surnameForSubm)} family`);

  // Shared notes
  const notes: string[] = [];
  const notesByIndi = new Map<string, string[]>();
  const sourcesByIndi = new Map<string, string[]>();
  const nickByIndi = new Map<string, string>();
  let n = 0;
  const addNote = (indi: string, text: string) => {
    const id = `@N${++n}@`;
    notes.push(...noteRecord(`0 ${id} NOTE`, 0, text));
    notesByIndi.set(indi, [...(notesByIndi.get(indi) ?? []), id]);
  };

  // Chapters → note on grandparent
  for (const ch of db.chapters) {
    addNote(gp.treePersonId, [ch.title, ...ch.paragraphs.map((p) => p.text)].join("\n"));
  }

  // Confirmed matches → note + source + nickname
  const confirmedEntityIds = new Set<string>();
  for (const m of db.matches.filter((x) => x.status === "confirmed")) {
    const e = entities.get(m.entityId);
    const tp = tree.persons.find((p) => p.id === m.treePersonId);
    if (!e || !tp) continue;
    confirmedEntityIds.add(e.id);
    if (e.givenName && e.givenName !== tp.givenName) nickByIndi.set(tp.id, e.givenName);
    const lines = [
      `In ${gp.sex === "F" ? "Grandma" : "Grandpa"} ${gpGiven}'s stories: ${e.mentionName} (${e.relationToGrandparent}).`,
    ];
    if (e.notes) lines.push(e.notes);
    const cites: string[] = [];
    for (const tid of e.turnIds) {
      const t = turns.get(tid);
      if (t) lines.push(`[${tid}] "${t.text.slice(0, 160)}"`);
      cites.push(`2 PAGE session ${sessionNo(tid)}, turn ${tid}`);
    }
    addNote(tp.id, lines.join("\n"));
    sourcesByIndi.set(tp.id, cites.length ? cites : ["2 PAGE conversations"]);
  }

  // INDI
  const famsOf = (id: string) => tree.families.filter((f) => f.husbandId === id || f.wifeId === id).map((f) => f.id);
  const famcOf = (id: string) => tree.families.filter((f) => f.childIds.includes(id)).map((f) => f.id);

  const indi = (p: TreePerson) => {
    L.push(`0 @${p.id}@ INDI`, `1 NAME ${clean(p.givenName)} /${clean(p.surname)}/`, `2 GIVN ${clean(p.givenName)}`, `2 SURN ${clean(p.surname)}`);
    const nick = nickByIndi.get(p.id) ?? p.nickname;
    if (nick) L.push(`2 NICK ${clean(nick)}`);
    if (p.birthSurname && p.birthSurname !== p.surname) {
      L.push(`1 NAME ${clean(p.givenName)} /${clean(p.birthSurname)}/`, `2 GIVN ${clean(p.givenName)}`, `2 SURN ${clean(p.birthSurname)}`, "2 TYPE maiden");
    }
    L.push(`1 SEX ${p.sex}`);
    if (p.birthYear != null || p.birthPlace) {
      L.push("1 BIRT");
      if (p.birthYear != null) L.push(`2 DATE ${p.birthYear}`);
      if (p.birthPlace) L.push(`2 PLAC ${clean(p.birthPlace)}`);
    }
    if (p.deathYear != null) L.push("1 DEAT", `2 DATE ${p.deathYear}`);
    if (p.occupation) L.push(`1 OCCU ${clean(p.occupation)}`);
    for (const nid of notesByIndi.get(p.id) ?? []) L.push(`1 NOTE ${nid}`);
    const src = sourcesByIndi.get(p.id);
    if (src) for (const page of src) L.push("1 SOUR @S1@", page);
    for (const f of famsOf(p.id)) L.push(`1 FAMS @${f}@`);
    for (const f of famcOf(p.id)) L.push(`1 FAMC @${f}@`);
  };
  tree.persons.forEach(indi);

  // Unmatched mentioned people
  if (opts.includeUnmatched) {
    let x = 0;
    for (const e of db.persons) {
      if (confirmedEntityIds.has(e.id)) continue;
      const given = clean(e.givenName ?? e.mentionName);
      const sur = clean(e.surname ?? "");
      L.push(`0 @X${++x}@ INDI`, `1 NAME ${given} /${sur}/`);
      if (e.givenName) L.push(`2 GIVN ${given}`);
      if (sur) L.push(`2 SURN ${sur}`);
      if (e.sex) L.push(`1 SEX ${e.sex}`);
      if (e.birthYear != null || e.place) {
        L.push("1 BIRT");
        if (e.birthYear != null) L.push(`2 DATE ${e.birthYearApprox ? "ABT " : ""}${e.birthYear}`);
        if (e.place) L.push(`2 PLAC ${clean(e.place)}`);
      }
      L.push(...noteRecord("1 NOTE", 1, `Mentioned in the stories: ${e.relationToGrandparent}. Unverified.`));
    }
  }

  // FAM
  for (const f of tree.families) {
    L.push(`0 @${f.id}@ FAM`);
    if (f.husbandId) L.push(`1 HUSB @${f.husbandId}@`);
    if (f.wifeId) L.push(`1 WIFE @${f.wifeId}@`);
    for (const c of f.childIds) L.push(`1 CHIL @${c}@`);
    if (f.marriageYear != null || f.marriagePlace) {
      L.push("1 MARR");
      if (f.marriageYear != null) L.push(`2 DATE ${f.marriageYear}`);
      if (f.marriagePlace) L.push(`2 PLAC ${clean(f.marriagePlace)}`);
    }
  }

  L.push(...notes);
  L.push("0 @S1@ SOUR", `1 TITL Conversations with ${clean(gpGiven)} ${clean(surnameForSubm)} (Heirloom)`, "1 PUBL Recorded 2026, transcribed automatically");
  L.push("0 TRLR");
  return "﻿" + L.join("\r\n") + "\r\n";
}
