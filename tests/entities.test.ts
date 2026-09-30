import { describe, expect, it } from "vitest";
import { mergeEntities } from "@/lib/entities";
import type { ExtractionOutput } from "@/lib/schemas";

const person = (o: Partial<ExtractionOutput["persons"][number]>): ExtractionOutput["persons"][number] => ({
  mentionName: "Pepa", givenName: "Pepa", surname: null, sex: "M", birthYear: null, birthYearApprox: false, place: null,
  relationToGrandparent: "kamarád", notes: "", existingId: null, turnIds: ["s1-t13"], ...o,
});
const valid = new Set(["s1-t13", "s1-t15", "s2-t03"]);
const empty = { persons: [], places: [], events: [] };

describe("mergeEntities", () => {
  it("drops unknown turnIds and items without turnIds", () => {
    const r = mergeEntities(empty, { persons: [person({ turnIds: ["s1-t13", "x-t1"] }), person({ mentionName: "Charles", givenName: "Charles", turnIds: ["zz"] })],
      places: [{ name: "Kladno", context: "", turnIds: ["nope"] }], events: [] }, valid);
    expect(r.persons).toHaveLength(1);
    expect(r.persons[0].turnIds).toEqual(["s1-t13"]);
    expect(r.places).toHaveLength(0);
  });

  it("merges by normalized name and by existingId, fills missing fields", () => {
    const a = mergeEntities(empty, { persons: [person({ surname: "Walker", mentionName: "Pepa Walker" })], places: [], events: [] }, valid);
    const b = mergeEntities(a, { persons: [person({ givenName: "pepa", birthYear: 1948, birthYearApprox: true, place: "Kladno", turnIds: ["s1-t15"] })],
      places: [], events: [] }, valid);
    expect(b.persons).toHaveLength(1);
    expect(b.persons[0]).toMatchObject({ surname: "Walker", birthYear: 1948, birthYearApprox: true, place: "Kladno" });
    expect(b.persons[0].turnIds.sort()).toEqual(["s1-t13", "s1-t15"]);
    const id = b.persons[0].id;
    const c = mergeEntities(b, { persons: [person({ mentionName: "Josef", givenName: "Josef", existingId: id, turnIds: ["s2-t03"] })], places: [], events: [] }, valid);
    expect(c.persons).toHaveLength(1);
    expect(c.persons[0].turnIds).toContain("s2-t03");
  });

  it("different surname -> different person; events link persons/places", () => {
    const r = mergeEntities(empty, {
      persons: [person({ surname: "Walker" }), person({ surname: "Novotný", mentionName: "Pepa Novotný" })],
      places: [{ name: "Praha", context: "pouť", turnIds: ["s1-t15"] }],
      events: [{ title: "Pouť", year: 1958, yearApprox: false, description: "", personNames: ["Pepa Walker"], placeNames: ["Praha"], turnIds: ["s1-t15"] }],
    }, valid);
    expect(r.persons).toHaveLength(2);
    expect(r.events[0].personIds).toEqual([r.persons[0].id]);
    expect(r.events[0].placeIds).toEqual([r.places[0].id]);
  });
});
