/** Lowercase, strip diacritics, collapse whitespace. */
export function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

/** Base form of a Czech surname for comparison: -ová → base, -á → -ý, then normalized. */
export function surnameBase(s: string | null | undefined): string {
  let v = (s ?? "").trim().toLowerCase();
  if (v.endsWith("ová") || v.endsWith("ova")) v = v.slice(0, -3);
  else if (v.endsWith("á")) v = v.slice(0, -1) + "ý";
  return normalize(v);
}
