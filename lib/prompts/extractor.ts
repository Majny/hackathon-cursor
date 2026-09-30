// PLAN §7.3 – entity extraction (task "extract", ExtractionSchema).
import type { Grandparent, PersonEntity, Turn } from "../types";
import { formatTranscript } from "./transcript";

export const EXTRACTOR_TEMPLATE = `From the transcript of a conversation with Grandpa Jerry (born {{birthYear}}, {{birthPlace}}) extract structured data for the family tree. Write descriptive fields in English, but keep names and places exactly as spoken (Czech spelling). Grandpa himself and his grandson Tom are NOT in the list of persons.

persons – every specific person mentioned, even if only a nickname was said:
- mentionName: exactly as it was said ("Pepa Walker", "my mum Anna").
- givenName: the first name or nickname as it was said ("Pepa"). Do NOT convert a nickname to a full name – another system does that. If only a relation was said ("my mum") and no name, use null.
- surname: the surname if it was said, otherwise null.
- sex: only when clear from the words or the name, otherwise null.
- birthYear: only if it was said, or can be computed directly from a sentence like "he was two years younger than me" (Grandpa was born in {{birthYear}}). If the year is computed or "about"/"around" was said, set birthYearApprox to true.
- place: where the person was from or lived, otherwise null.
- relationToGrandparent: relation to Grandpa ("childhood friend, neighbour").
- notes: one sentence about what we know about them.
- existingId: if this is a person from the KNOWN PERSONS list, fill in their id, otherwise null.
- turnIds: IDs of the turns where the person was mentioned.

places – towns, districts, workplaces ("the Poldi steelworks"), each with context and turnIds.
events – events with a year (year and yearApprox), names of the people involved (mentionName) and place names, with a description and turnIds.

Rules: only what was actually said in the transcript. Uncertain values are null. Every item must have at least one turnId that exists in the transcript. List the same person mentioned several times only once.`;

export function renderExtractorSystem(gp: Pick<Grandparent, "birthYear" | "birthPlace">): string {
  return EXTRACTOR_TEMPLATE.replaceAll("{{birthYear}}", String(gp.birthYear)).replaceAll("{{birthPlace}}", gp.birthPlace);
}

export function buildExtractorUser(input: { turns: Turn[]; knownPersons: PersonEntity[]; grandparent?: Pick<Grandparent, "birthYear" | "birthPlace"> }): string {
  const gp = input.grandparent;
  const hints = gp
    ? `\n\nREMINDERS:\n- Grandpa was born in ${gp.birthYear}: "two years younger than me" means birthYear ${gp.birthYear + 2} and birthYearApprox true; "a year older" means ${gp.birthYear - 1} and birthYearApprox true.\n- If a person lived "next door", "in our street" or "near us", place is the town where Grandpa lived at the time (from the transcript, otherwise ${gp.birthPlace}).`
    : "";
  const known = input.knownPersons.length
    ? input.knownPersons.map((p) => `${p.id} | ${p.mentionName} | ${p.relationToGrandparent}`).join("\n")
    : "None.";
  return `KNOWN PERSONS (id | mentionName | relation):\n${known}\n\nTRANSCRIPT:\n${formatTranscript(input.turns)}${hints}`;
}
