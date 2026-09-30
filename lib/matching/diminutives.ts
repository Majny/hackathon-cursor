import { normalize } from "./normalize";

/** Canonical given name → diminutives. Cleaned from docs/research/gedcom-tree.md. */
export const MALE_DIMINUTIVES: Record<string, string[]> = {
  Josef: ["Pepa", "Pepík", "Pepíček", "Pepan", "Jožka", "Joža", "Jožin", "Józa"],
  Jan: ["Honza", "Honzík", "Honzíček", "Jenda", "Jeník", "Janek", "Janík"],
  František: ["Franta", "Fanda", "Frantík", "Fanoš", "Ferda"],
  Jiří: ["Jirka", "Jiřík", "Jiříček", "Jura", "Juraj"],
  Václav: ["Vašek", "Venca", "Vašík", "Véna", "Vácha"],
  Karel: ["Karlík", "Kája", "Karlíček"],
  Antonín: ["Tonda", "Toník", "Tony"],
  Jaroslav: ["Jarda", "Jaroušek", "Jarek"],
  Miroslav: ["Mirek", "Míra", "Miroušek"],
  Vladimír: ["Vláďa", "Vlada", "Vlaďka"],
  Zdeněk: ["Zdenda", "Zdenko"],
  Ladislav: ["Láďa", "Laco"],
  Stanislav: ["Standa", "Stáňa", "Staník"],
  Bohumil: ["Bohouš", "Bohoušek", "Bóža"],
  Bohuslav: ["Bohouš", "Slávek"],
  Jaromír: ["Jarda", "Jarouš"],
  Miloslav: ["Míla", "Milouš"],
  Petr: ["Péťa", "Petřík", "Peťa"],
  Pavel: ["Pavlík", "Pája", "Pavlíček"],
  Tomáš: ["Tomík", "Tom", "Tomášek"],
  Martin: ["Marťa", "Martínek", "Máťa"],
  Vojtěch: ["Vojta", "Vojtíšek"],
  Jindřich: ["Jindra", "Jindříšek"],
  Matěj: ["Máťa", "Matějíček"],
  Oldřich: ["Olda", "Oldříšek"],
  Rudolf: ["Ruda", "Rudla", "Rudík"],
  Břetislav: ["Břeťa", "Břéťa"],
  Emil: ["Milek"],
  Alois: ["Lojza", "Lojzík"],
  Augustin: ["Gusta"],
};

export const FEMALE_DIMINUTIVES: Record<string, string[]> = {
  Marie: ["Mařenka", "Máňa", "Mařka", "Maruška", "Marka", "Mája", "Majka", "Mánička"],
  Anna: ["Anička", "Andula", "Anča", "Ančka", "Anka", "Nána"],
  Božena: ["Božka", "Boženka", "Bóža"],
  Ludmila: ["Lída", "Lidka", "Lidunka", "Míla", "Milka"],
  Jana: ["Janička", "Janinka", "Jája"],
  Věra: ["Věrka", "Věruška"],
  Alžběta: ["Běta", "Bětka", "Bětuška", "Elza"],
  Kateřina: ["Katka", "Káča", "Kačenka", "Kačka"],
  Tereza: ["Terka", "Terezka", "Terezie"],
  Terezie: ["Terka", "Rézi", "Tereza"],
  Růžena: ["Růža", "Růženka", "Růžička"],
  Josefa: ["Pepina", "Pepička", "Josefka", "Jožka"],
  Františka: ["Fanda", "Fanynka", "Fany"],
  Emilie: ["Ema", "Emilka", "Milka"],
  Zdeňka: ["Zdena", "Zdenička", "Zdenka"],
  Jaroslava: ["Jarka", "Jaruška", "Slávka"],
  Vlasta: ["Vlastička", "Vlastina"],
  Hana: ["Hanka", "Hanička"],
  Helena: ["Helenka", "Hela", "Lenka"],
  Magdalena: ["Magda", "Madla", "Lenka"],
  Barbora: ["Bára", "Barborka", "Baruška"],
  Karolína: ["Karla", "Kája", "Karolínka"],
  Olga: ["Olinka", "Olča"],
  Milada: ["Milka", "Míla", "Miládka"],
  Libuše: ["Libuška", "Liba"],
  Lucie: ["Lucka", "Lucinka"],
  Eva: ["Evička", "Evka"],
};

interface Canon { name: string; display: string; sex: "M" | "F" }

const LOOKUP: Map<string, Canon[]> = (() => {
  const map = new Map<string, Canon[]>();
  const add = (variant: string, c: Canon) => {
    const key = normalize(variant);
    const list = map.get(key) ?? [];
    if (!list.some((x) => x.name === c.name && x.sex === c.sex)) list.push(c);
    map.set(key, list);
  };
  for (const [sex, dict] of [["M", MALE_DIMINUTIVES], ["F", FEMALE_DIMINUTIVES]] as const) {
    for (const [canonical, variants] of Object.entries(dict)) {
      const c: Canon = { name: normalize(canonical), display: canonical, sex };
      add(canonical, c);
      for (const v of variants) add(v, c);
    }
  }
  return map;
})();

/**
 * Canonical forms of a given name (normalized). Uses sex to disambiguate when known.
 * Unknown names map to themselves. `isDiminutive` = name differs from every canonical.
 */
export function canonicalGiven(given: string, sex: "M" | "F" | null): { canon: string[]; display: string[]; isDiminutive: boolean } {
  const key = normalize(given);
  let list = LOOKUP.get(key) ?? [];
  if (sex && list.some((c) => c.sex === sex)) list = list.filter((c) => c.sex === sex);
  if (!list.length) return { canon: [key], display: [given], isDiminutive: false };
  const canon = [...new Set(list.map((c) => c.name))];
  const display = [...new Set(list.map((c) => c.display))];
  return { canon, display, isDiminutive: !canon.includes(key) };
}
