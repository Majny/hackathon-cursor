import type { FamilyTree, TreePerson } from "@/lib/types";

const name = (p: TreePerson | undefined) => (p ? `${p.givenName} ${p.surname}` : "");

/** Short human description of a tree person's closest relatives (English). */
export function describeRelatives(tree: FamilyTree, id: string): string {
  const byId = new Map(tree.persons.map((p) => [p.id, p]));
  const me = byId.get(id);
  if (!me) return "";
  const bits: string[] = [];
  for (const f of tree.families) {
    if (f.husbandId === id && f.wifeId) bits.push(`husband of ${name(byId.get(f.wifeId))}`);
    if (f.wifeId === id && f.husbandId) bits.push(`wife of ${name(byId.get(f.husbandId))}`);
    if (f.childIds.includes(id)) {
      const parents = [f.husbandId, f.wifeId].filter(Boolean).map((p) => name(byId.get(p!)));
      if (parents.length) bits.push(`${me.sex === "F" ? "daughter" : "son"} of ${parents.join(" & ")}`);
      const sibs = f.childIds.filter((c) => c !== id).map((c) => name(byId.get(c)));
      if (sibs.length) bits.push(`siblings: ${sibs.join(", ")}`);
    }
  }
  return bits.join(" · ");
}

export function lifeSpan(p: TreePerson): string {
  const b = p.birthYear ? `*${p.birthYear}` : "";
  const d = p.deathYear ? ` †${p.deathYear}` : "";
  return `${b}${d}${p.birthPlace ? `, ${p.birthPlace}` : ""}`;
}
