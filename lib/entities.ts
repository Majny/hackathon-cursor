// PLAN §7.3 – merge LLM extraction into stored entities. Pure, deterministic. Owned by WP2.
import type { EventEntity, PersonEntity, PlaceEntity } from "./types";
import type { ExtractionOutput } from "./schemas";
import { newId } from "./ids";

export interface EntitySets {
  persons: PersonEntity[];
  places: PlaceEntity[];
  events: EventEntity[];
}

export function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];

function samePerson(p: PersonEntity, given: string, surname: string, mention: string): boolean {
  const pg = norm(p.givenName);
  const ps = norm(p.surname);
  if (given && pg) {
    if (pg !== given) return false;
    return !surname || !ps || ps === surname;
  }
  // no given name (e.g. "maminka") -> compare mentionName
  return !!mention && norm(p.mentionName) === mention;
}

/**
 * Merge extraction into existing entities (returns new arrays; input not mutated).
 * - persons: by existingId, else by normalized given name + surname (null surname matches any);
 * - unknown turnIds are dropped, items without turnIds are dropped.
 */
export function mergeEntities(existing: EntitySets, ex: ExtractionOutput, validTurnIds: Set<string>): EntitySets {
  const persons = existing.persons.map((p) => ({ ...p, turnIds: [...p.turnIds] }));
  const places = existing.places.map((p) => ({ ...p, turnIds: [...p.turnIds] }));
  const events = existing.events.map((e) => ({ ...e, turnIds: [...e.turnIds] }));
  const valid = (ids: string[]) => [...new Set(ids.filter((id) => validTurnIds.has(id)))];

  for (const x of ex.persons) {
    const turnIds = valid(x.turnIds);
    if (!turnIds.length) continue;
    const given = norm(x.givenName);
    const surname = norm(x.surname);
    const mention = norm(x.mentionName);
    let target =
      (x.existingId ? persons.find((p) => p.id === x.existingId) : undefined) ??
      persons.find((p) => samePerson(p, given, surname, mention));
    if (!target) {
      target = {
        id: newId("per"), mentionName: x.mentionName, givenName: x.givenName, surname: x.surname, sex: x.sex,
        birthYear: x.birthYear, birthYearApprox: x.birthYearApprox, place: x.place,
        relationToGrandparent: x.relationToGrandparent, notes: x.notes, turnIds,
      };
      persons.push(target);
      continue;
    }
    target.turnIds = union(target.turnIds, turnIds);
    if (!target.surname && x.surname) { target.surname = x.surname; target.mentionName = x.mentionName; }
    target.givenName ??= x.givenName;
    target.sex ??= x.sex;
    if (x.birthYear != null && (target.birthYear == null || (target.birthYearApprox && !x.birthYearApprox))) {
      target.birthYear = x.birthYear;
      target.birthYearApprox = x.birthYearApprox;
    }
    target.place ??= x.place;
    if (!target.relationToGrandparent.trim()) target.relationToGrandparent = x.relationToGrandparent;
    if (x.notes.trim() && !target.notes.includes(x.notes.trim())) {
      target.notes = target.notes.trim() ? `${target.notes.trim()} ${x.notes.trim()}` : x.notes.trim();
    }
  }

  for (const x of ex.places) {
    const turnIds = valid(x.turnIds);
    if (!turnIds.length) continue;
    const key = norm(x.name);
    const target = places.find((p) => norm(p.name) === key);
    if (target) {
      target.turnIds = union(target.turnIds, turnIds);
      if (!target.context.trim()) target.context = x.context;
    } else {
      places.push({ id: newId("pl"), name: x.name, context: x.context, turnIds });
    }
  }

  const findPersonId = (name: string) => {
    const n = norm(name);
    return (
      persons.find((p) => norm(p.mentionName) === n) ??
      persons.find((p) => [p.givenName, p.surname].filter(Boolean).map(norm).join(" ") === n) ??
      persons.find((p) => norm(p.givenName) && n.split(" ").includes(norm(p.givenName)))
    )?.id;
  };
  const findPlaceId = (name: string) => places.find((p) => norm(p.name) === norm(name))?.id;

  for (const x of ex.events) {
    const turnIds = valid(x.turnIds);
    if (!turnIds.length) continue;
    const personIds = [...new Set(x.personNames.map(findPersonId).filter((v): v is string => !!v))];
    const placeIds = [...new Set(x.placeNames.map(findPlaceId).filter((v): v is string => !!v))];
    const target = events.find((e) => norm(e.title) === norm(x.title) && (e.year == null || x.year == null || e.year === x.year));
    if (target) {
      target.turnIds = union(target.turnIds, turnIds);
      target.personIds = union(target.personIds, personIds);
      target.placeIds = union(target.placeIds, placeIds);
      if (target.year == null && x.year != null) { target.year = x.year; target.yearApprox = x.yearApprox; }
    } else {
      events.push({
        id: newId("ev"), title: x.title, year: x.year, yearApprox: x.yearApprox, description: x.description,
        personIds, placeIds, turnIds,
      });
    }
  }

  return { persons, places, events };
}
