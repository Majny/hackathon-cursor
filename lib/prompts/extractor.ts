// PLAN §7.3 – entity extraction (task "extract", ExtractionSchema).
import type { Grandparent, PersonEntity, Turn } from "../types";
import { formatTranscript } from "./transcript";

export const EXTRACTOR_TEMPLATE = `Z přepisu rozhovoru s dědou Jaroslavem (narozen {{birthYear}}, {{birthPlace}}) vytáhni strukturovaná data pro rodokmen. Vše česky. Děda sám a vnuk Tomáš NEJSOU v seznamu osob.

persons – každý konkrétní zmíněný člověk, i když zazněla jen přezdívka:
- mentionName: přesně jak zaznělo („Pepa Dvořák“, „maminka“).
- givenName: křestní jméno nebo přezdívka tak, jak zazněla („Pepa“). Přezdívku NEPŘEVÁDĚJ na plné jméno – to dělá jiný systém. Když zazní jen vztah („maminka“) a jméno ne, dej null.
- surname: příjmení, pokud zaznělo, jinak null.
- sex: jen když je jasné z gramatiky nebo jména, jinak null.
- birthYear: jen když zaznělo, nebo jde přímo spočítat z věty typu „byl o dva roky mladší než já“ (děda je z roku {{birthYear}}). Když je rok spočítaný nebo zazní „asi“ či „kolem“, nastav birthYearApprox na true.
- place: odkud osoba je nebo kde žila, jinak null.
- relationToGrandparent: vztah k dědovi („kamarád z dětství, soused“).
- notes: jedna věta o tom, co o něm víme.
- existingId: pokud jde o osobu ze seznamu ZNÁMÉ OSOBY, vyplň její id, jinak null.
- turnIds: ID replik, kde osoba zazněla.

places – obce, čtvrti, podniky („huť Poldi“), každé s kontextem a turnIds.
events – události s rokem (year a yearApprox), jmény zúčastněných osob (mentionName) a názvy míst, s popisem a turnIds.

Pravidla: jen to, co v přepisu skutečně zaznělo. Nejisté hodnoty dej null. Každá položka musí mít aspoň jedno turnId, které v přepisu existuje. Stejnou osobu zmíněnou víckrát uveď jen jednou.`;

export function renderExtractorSystem(gp: Pick<Grandparent, "birthYear" | "birthPlace">): string {
  return EXTRACTOR_TEMPLATE.replaceAll("{{birthYear}}", String(gp.birthYear)).replaceAll("{{birthPlace}}", gp.birthPlace);
}

export function buildExtractorUser(input: { turns: Turn[]; knownPersons: PersonEntity[]; grandparent?: Pick<Grandparent, "birthYear" | "birthPlace"> }): string {
  const gp = input.grandparent;
  const hints = gp
    ? `\n\nPŘIPOMÍNKY:\n- Děda je z roku ${gp.birthYear}: „o dva roky mladší než já“ znamená birthYear ${gp.birthYear + 2} a birthYearApprox true; „o rok starší“ znamená ${gp.birthYear - 1} a birthYearApprox true.\n- Když osoba bydlela „vedle“, „v naší ulici“ nebo „od nás“, je place obec, kde děda tehdy žil (z přepisu, jinak ${gp.birthPlace}).`
    : "";
  const known = input.knownPersons.length
    ? input.knownPersons.map((p) => `${p.id} | ${p.mentionName} | ${p.relationToGrandparent}`).join("\n")
    : "Žádné.";
  return `ZNÁMÉ OSOBY (id | mentionName | relace):\n${known}\n\nPŘEPIS:\n${formatTranscript(input.turns)}${hints}`;
}
