# GEDCOM + family-tree research for the "AI životopisec" hackathon demo

## Recommendation in one paragraph
Export **GEDCOM 5.5.1** with `1 CHAR UTF-8`. Write the generator yourself. It is about 80 lines of TypeScript, simpler and more predictable than any library, because the demo only needs HEAD, SUBM, INDI, FAM, NOTE, OBJE, SOUR and TRLR. If you want to prove the export round-trips, use **read-gedcom** (TS, zero deps, under 20 kB gzipped) in a test to parse the file back. For the tree UI use **family-chart** (donatso, MIT, D3, React-friendly). Its `{id, data, rels:{parents,spouses,children}}` format maps almost 1:1 to INDI/FAM. For person matching, normalize names (strip diacritics, map diminutives to canonical names, handle the -ová suffix), then score with Jaro-Winkler plus birth-year tolerance plus place.

---

## 1. GEDCOM 5.5.1 vs 7.0

| | 5.5.1 (1999/2019 re-release) | 7.0 (2021, now 7.0.x) |
|---|---|---|
| Encoding | `1 CHAR UTF-8` (also ANSEL/ASCII/UNICODE allowed) | UTF-8 only, no CHAR tag |
| Long text | `CONT` (newline) + `CONC` (join without newline) | only `CONT`; **CONC removed** (reserved) |
| Line length | max **255 chars** incl. level, tag, delimiters, terminator | no line-length limit |
| Media FORM | enum: `bmp gif jpg ole pcx tif wav` | IANA MIME type (`audio/mpeg`, `image/jpeg`) |
| Media packaging | file paths/URLs only | **GEDzip** (.gdz = .ged + media in a zip) |
| Header | `GEDC/VERS 5.5.1` + `GEDC/FORM LINEAGE-LINKED` + `SOUR` + `SUBM` pointer + `CHAR` | `GEDC/VERS 7.0` |
| Import support | Universal (MyHeritage, Geni, FamilySearch Tree, Ancestry, Gramps, RootsMagic) | Patchy, and large commercial sites often reject it |

**Which to use:** use 5.5.1. MyHeritage's own GEDCOM wiki calls 5.5.1 "commonly used", and their sample export has `1 CHAR UTF-8`. It does not say whether they import 7.0. Third-party guides say GEDCOM 7 support is still patchy on large commercial platforms. Geni and Ancestry import 5.5.1 fine. (Note: FamilySearch has *withdrawn* GEDCOM export from Family Tree, per AncestorIQ, but import to personal trees and the gedcom.io tooling remain.)

### Minimal valid 5.5.1 structure
- `0 HEAD` must have `1 SOUR <system id>`, `1 GEDC` / `2 VERS 5.5.1` / `2 FORM LINEAGE-LINKED`, `1 CHAR UTF-8`, and `1 SUBM @Uxx@` (the SUBM record is required in 5.5.1).
- Records: `0 @I1@ INDI`, `0 @F1@ FAM`, `0 @N1@ NOTE <text>`, `0 @M1@ OBJE`, `0 @S1@ SOUR`, `0 @U1@ SUBM`.
- Ends with `0 TRLR`.
- Cross-references go both ways: INDI has `FAMS`/`FAMC`, and FAM has `HUSB`/`WIFE`/`CHIL`.
- Use CRLF line endings for maximum compatibility. A UTF-8 BOM is optional; `CHAR UTF-8` is what importers read. Adding a BOM is harmless and helps some Windows desktop apps.

### Long text (stories) in NOTE: CONT/CONC rules (5.5.1 spec text)
- Every physical line, including level, xref, tag, delimiters and terminator, **must not exceed 255 characters**. Keep each value chunk at **200 characters or fewer** to be safe with multibyte Czech characters. Some parsers count bytes, and "ř"/"ž" are 2 bytes in UTF-8.
- `CONT` = a new line (use one per paragraph or newline in the story). An empty paragraph is `n CONT` with no value.
- `CONC` = join to the previous value with **no** separator. The spec says: *"Values that are split for a CONC tag must always be split at a nonspace. If the value is split on a space the space will be lost when concatenation takes place"* (many apps trim trailing whitespace). So **split in the middle of a word**, never next to a space.
- `CONT`/`CONC` sit one level below the line they continue (`0 @N1@ NOTE ...` → `1 CONC ...`; `1 NOTE ...` inside INDI → `2 CONC ...`).
- Put the story in a **shared NOTE record** (`0 @N1@ NOTE`) and reference it from INDI with `1 NOTE @N1@`. This keeps INDI tidy, and one story can link to several people.
- Escape any `@` in the text as `@@`.

Splitter algorithm (TS pseudo):
```ts
function noteLines(level: number, text: string, max = 200): string[] {
  const out: string[] = [];
  text.replace(/\r\n?/g, "\n").split("\n").forEach((para, pi) => {
    para = para.replace(/@/g, "@@");
    const chunks: string[] = [];
    while (para.length > max) {
      let cut = max;
      // never cut next to a space (CONC rule): move the cut left until both sides are non-space
      while (cut > 1 && (para[cut - 1] === " " || para[cut] === " ")) cut--;
      chunks.push(para.slice(0, cut)); para = para.slice(cut);
    }
    chunks.push(para);
    chunks.forEach((c, ci) => {
      if (pi === 0 && ci === 0) out.push(c);                // goes on the NOTE line itself
      else out.push(`${level + 1} ${ci === 0 ? "CONT" : "CONC"}${c ? " " + c : ""}`);
    });
  });
  return out; // out[0] is the value for "<level> NOTE"; the rest are continuation lines
}
```
(Count UTF-8 bytes with `Buffer.byteLength` / `TextEncoder` if you want to be strict.)

### Czech diacritics
Write the file as UTF-8 (`fs.writeFile(path, text, "utf8")`, or a `Blob([text], {type: "text/plain;charset=utf-8"})` for download) plus `1 CHAR UTF-8`. Optionally add `2 VERS 2.0` under CHAR? No. Leave it plain. Add `1 LANG Czech` in HEAD. Names use slashes around the surname: `1 NAME Josef /Novák/`, plus `2 GIVN Josef`, `2 SURN Novák`, and for a nickname `2 NICK Pepa`. For married women: `1 NAME Marie /Nováková/` and a second `1 NAME Marie /Dvořáková/` with `2 TYPE birth` (5.5.1 also supports `2 TYPE maiden`).

### Referencing audio files
- 5.5.1: `OBJE` with `1 FILE <path or URL>`, `2 FORM <fmt>`, `3 TYPE audio`, `2 TITL ...`. `wav` is the only audio format in the official enum. In practice apps accept `FORM mp3` / `m4a` / `webm`, and strict validators warn. For the demo, either export `wav` or use `mp3` and accept the warning.
- Importers do **not** reliably fetch remote media or local paths. MyHeritage's wiki does not document GEDCOM media import, so verify on site if it matters. A robust fallback: also put the audio URL as a line in the story NOTE ("Nahrávka: https://..."), so the link survives any import.
- 7.0 alternative (only if you want a "future-proof" extra): `2 FORM audio/mpeg` and ship a **GEDzip** containing the .ged and the audio files. Treat it as a bonus, not the main export.

### Sample minimal GEDCOM 5.5.1 (story, audio, source, 1 family)
```
0 HEAD
1 SOUR AI_ZIVOTOPISEC
2 VERS 0.1
2 NAME AI životopisec pro prarodiče
1 DATE 30 SEP 2026
1 SUBM @U1@
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8
1 LANG Czech
0 @U1@ SUBM
1 NAME Rodina Novákových
0 @I1@ INDI
1 NAME Josef /Novák/
2 GIVN Josef
2 SURN Novák
2 NICK Pepa
1 SEX M
1 BIRT
2 DATE 12 MAR 1938
2 PLAC Třebíč, Vysočina, Česko
1 OCCU strojník
1 NOTE @N1@
1 OBJE @M1@
1 SOUR @S1@
2 PAGE rozhovor 30. 9. 2026, 00:12:40
1 FAMS @F1@
0 @I2@ INDI
1 NAME Marie /Nováková/
2 GIVN Marie
2 SURN Nováková
1 NAME Marie /Dvořáková/
2 TYPE maiden
1 SEX F
1 BIRT
2 DATE ABT 1941
2 PLAC Jihlava
1 FAMS @F1@
0 @I3@ INDI
1 NAME Jan /Novák/
2 NICK Honza
1 SEX M
1 BIRT
2 DATE 1965
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 1962
2 PLAC Třebíč
0 @N1@ NOTE Dědeček Pepa vyprávěl, jak v roce 1956 poprvé řídil traktor Zetor na družs
1 CONC tevním poli u Třebíče. Bylo mu osmnáct a celá vesnice se chodila dívat.
1 CONT
1 CONT Nahrávka: https://example.org/audio/josef-traktor.mp3
0 @M1@ OBJE
1 FILE https://example.org/audio/josef-traktor.mp3
2 FORM mp3
3 TYPE audio
2 TITL Vyprávění: první traktor (1956)
0 @S1@ SOUR
1 TITL Rozhovor s Josefem Novákem (AI životopisec)
1 AUTH Jan Novák
1 PUBL Nahráno 30. 9. 2026, přepsáno automaticky
0 TRLR
```
(Note the CONC split mid-word "druž|stevním", per the spec. Use `FORM wav` if you need strict-validator cleanliness.)

---

## 2. JS/TS GEDCOM libraries

| Library | Notes | Verdict |
|---|---|---|
| **read-gedcom** (arbre-app, TS) | Tolerant parser, encoding detection, date parsing, zero deps, under 20 kB gz. **Read-only.** | Best for parsing an uploaded tree and for round-trip tests |
| **parse-gedcom** (tmcw) | Tiny, simple → AST (unist). v2.0.1, not updated for about 5 years | OK for quick parse |
| **gedcom** (npm, v3.x, recently published) | Same "small, simple 5.5.1 parser" family | Alternative |
| **@treeviz/gedcom-parser** | 5.5.1, pluggable, CLI, place matching | Heavier than needed |
| **@it9gamelog/gedcom-parser** | TS, streaming, pointer resolution | Overkill |

None of these is a mature *writer*. **Hand-write the generator** from your internal model (Person/Family/Story/Audio → lines). Validate once with **GEDCOM validators**: gedcom.io lists tools such as GEDCOM Validator (Chronoplex) and gedcom.io's 7.0 checker. Or do a quick import into Gramps (free) or a MyHeritage test tree during the hackathon.

---

## 3. Family-tree visualization for React/Next.js

| Library | Pros | Cons |
|---|---|---|
| **family-chart** (donatso) — **recommended** | MIT, D3-based, built for genealogy (spouses, multiple parents), zoom/pan, card templates with avatars, built-in edit form, TS types, framework-agnostic (mount in a `useEffect` on a div ref). Data: `{id, data:{gender:"M"/"F", "first name", "last name", birthday, avatar}, rels:{parents:[], spouses:[], children:[]}}`. About 780 stars, active | Imperative D3 API (wrap it in a client component with `"use client"` plus dynamic import, `ssr:false`). Relations must be **bidirectional**. Some advanced features (kinship, filtering) are in a paid "Premium" repo |
| **relatives-tree** + **react-family-tree** (SanichKotikov) | MIT, a tiny (about 3 kB) *layout-only* engine; you render the nodes as your own React components, so styling is full JSX/Tailwind | You draw the connectors yourself; less polished UX; smaller community (about 56 stars); needs a root id and treats the tree as a single-root view |
| **react-d3-tree** | Popular, declarative React, small footprint, custom node render | Built for **hierarchical single-parent trees**, so two parents/spouses need hacks. Poor fit for genealogy |
| Balkan FamilyTreeJS / GoJS / yFiles | Very polished | Commercial licenses. Avoid for a hackathon |

Mapping from GEDCOM model → family-chart: for each FAM, add HUSB↔WIFE to each other's `spouses`, add CHIL to both parents' `children`, and add both parents to each child's `parents`. Put the story snippet/audio URL in `data` and show it in a custom card or side panel on click.

---

## 4. Fuzzy person matching for Czech names

### Pipeline
1. **Normalize:** trim, lowercase, `normalize("NFD").replace(/\p{Diacritic}/gu, "")` (keep the original for display), collapse spaces.
2. **Given name → canonical:** look up in the diminutive map below (after diacritic stripping). Unknown names stay as they are.
3. **Surname:** strip the female suffix for comparison: `-ová` → base (`Nováková` → `novak`, `Dvořáková` → `dvorak`, `Černá` ↔ `Černý`: map `-á`→`-ý` for adjective surnames). Compare against **all** of the person's surnames (married and maiden).
4. **Score** (0–1):
   - given name: 1.0 if canonical equal, else Jaro-Winkler(canonical) (catches typos like Frantisek/Františk)
   - surname: Jaro-Winkler on base form
   - birth year: 1.0 if |Δ| = 0, 0.8 if ≤ 1, 0.5 if ≤ 3, 0.2 if ≤ 5, 0 otherwise (widen the window when the date is "cca/ABT")
   - place: 1.0 same normalized town, 0.5 same district/region or one contains the other, 0 otherwise; if unknown, drop the weight
   - sex mismatch → hard reject
   - `total = 0.35*given + 0.30*surname + 0.25*year + 0.10*place` (re-normalize the weights over the fields that are present)
   - Thresholds: ≥ 0.85 auto-merge suggestion, 0.65–0.85 ask the user ("Je Pepa Novák (1938) stejná osoba jako Josef Novák (*1937)?"), < 0.65 treat as a new person.
5. **Tie-breakers:** shared relatives (same spouse or parent) add +0.1.
6. **Libraries:** a Jaro-Winkler implementation is about 30 lines (or use `talisman/metrics/jaro-winkler`, or `fastest-levenshtein` for edit distance). `Fuse.js` is fine for the UI search box but not for the scoring. For the hackathon you can also give the LLM the top 3 candidates and ask it to confirm, while keeping the deterministic score as the gate.

### Diminutive dictionary (canonical ← variants, diacritics included; strip them when building the lookup)
```ts
export const DIMINUTIVES: Record<string, string[]> = {
  // men
  "Josef": ["Pepa","Pepík","Pepíček","Pepan","Jožka","Joža","Jožin","Józa"],
  "Jan": ["Honza","Honzík","Honzíček","Jenda","Jeník","Janek","Janík"],
  "František": ["Franta","Františka?","Fanda","Frantík","Fanoš","Ferda"].filter(n=>!n.endsWith("?")),
  "Jiří": ["Jirka","Jiřík","Jiříček","Jura","Juraj"],
  "Václav": ["Vašek","Venca","Vašík","Véna","Vácha"],
  "Karel": ["Karlík","Kája","Karlíček","Karla?"].filter(n=>!n.endsWith("?")),
  "Antonín": ["Tonda","Toník","Toník","Tony"],
  "Jaroslav": ["Jarda","Jaroušek","Jarek"],
  "Miroslav": ["Mirek","Míra","Miroušek"],
  "Vladimír": ["Vláďa","Vlád'a","Vlada","Vlaďka"],
  "Zdeněk": ["Zdenda","Zdeňek","Zdenek","Zdenko"],
  "Ladislav": ["Láďa","Laďa","Laco"],
  "Stanislav": ["Standa","Stáňa","Staník"],
  "Bohumil": ["Bohouš","Bohoušek","Bóža"],
  "Bohuslav": ["Bohouš","Slávek"],
  "Jaromír": ["Jarda","Jarouš"],
  "Josef Jr.": [],
  "Petr": ["Péťa","Petřík","Peťa"],
  "Pavel": ["Pavlík","Pája","Pavlíček"],
  "Tomáš": ["Tomík","Tom","Tomášek"],
  "Martin": ["Marťa","Martínek","Máťa"],
  "Vojtěch": ["Vojta","Vojtíšek"],
  "Jindřich": ["Jindra","Jindříšek","Jindřiška?"].filter(n=>!n.endsWith("?")),
  "Matěj": ["Máťa","Matějíček"],
  "Oldřich": ["Olda","Oldříšek"],
  "Rudolf": ["Ruda","Rudla","Rudík"],
  "Břetislav": ["Břeťa","Břéťa"],
  "Emil": ["Milek"],
  "Alois": ["Lojza","Lojzík","Lojzička?"].filter(n=>!n.endsWith("?")),
  "Augustin": ["Gustav?","Gusta"].filter(n=>!n.endsWith("?")),
  // women
  "Marie": ["Mařenka","Máňa","Mařka","Maruška","Marie","Marka","Mája","Majka","Mánička"],
  "Anna": ["Anička","Andula","Anča","Ančka","Anka","Nána"],
  "Božena": ["Božka","Boženka","Bóža"],
  "Ludmila": ["Lída","Lidka","Lidunka","Míla","Milka"],
  "Jana": ["Janička","Janinka","Jája"],
  "Věra": ["Věrka","Věruška"],
  "Alžběta": ["Běta","Bětka","Bětuška","Elza"],
  "Kateřina": ["Katka","Káča","Kačenka","Kačka"],
  "Tereza": ["Terka","Terezka","Terezie"],
  "Terezie": ["Terka","Rézi","Tereza"],
  "Růžena": ["Růža","Růženka","Růžička"],
  "Josefa": ["Pepina","Pepička","Josefka","Jožka"],
  "Františka": ["Fanda","Fanynka","Fany","Františka"],
  "Emilie": ["Ema","Emilka","Milka"],
  "Zdeňka": ["Zdena","Zdenička","Zdenka"],
  "Jaroslava": ["Jarka","Jaruška","Slávka"],
  "Vlasta": ["Vlastička","Vlastina"],
  "Hana": ["Hanka","Hanička","Hanička"],
  "Helena": ["Helenka","Hela","Lenka"],
  "Magdalena": ["Magda","Madla","Lenka"],
  "Barbora": ["Bára","Barborka","Baruška"],
  "Karolína": ["Karla","Kája","Karolínka"],
  "Olga": ["Olinka","Olča"],
  "Milada": ["Milka","Míla","Miládka"],
  "Libuše": ["Libuška","Liba"],
};
```
Clean-up before shipping: remove the `?`-filter hacks and the empty `"Josef Jr."` entry (placeholders), and dedupe values. Build the reverse lookup `stripDiacritics(lower(variant)) → canonical[]`. Some diminutives are **ambiguous**: Jarda → Jaroslav/Jaromír, Míla → Miloslav/Ludmila/Milada, Kája → Karel/Karolína, Jožka → Josef/Josefa, Fanda → František/Františka, Lenka → Helena/Magdalena, Bohouš → Bohumil/Bohuslav. Use **sex** to disambiguate. If it is still ambiguous, give the given-name score 0.9 against any of the canonicals instead of 1.0.

---

## Sources
- GEDCOM 5.5.1 spec (255-char limit, CONC "must always be split at a nonspace", MULTIMEDIA_FORMAT enum incl. `wav`, CHAR incl. UTF-8): https://gedcom.io/specifications/ged551.pdf
- FamilySearch GEDCOM 7 spec (CONC removed/reserved, media types, GEDzip): https://gedcom.io/specifications/FamilySearchGEDCOMv7.html
- Migrating 5.5.1 → 7.0: https://gedcom.io/migrate/
- GEDCOM changelog: https://gedcom.io/changelog/
- FamilySearch "What is GEDCOM 7.0": https://www.familysearch.org/en/help/helpcenter/article/what-is-the-familysearch-gedcom-7-0-standard
- MyHeritage "How to work with GEDCOM files" (5.5.1 common, UTF-8 advice): https://www.myheritage.com/wiki/How_to_work_with_GEDCOM_files
- GEDCOM 7 compatibility breakdown: https://sites.google.com/view/generagenealogicalservices/blog/gedcom-7-0-compatibility-breakdown
- FamilySearch GEDCOM export withdrawn: https://ancestoriq.com/guides/export-tree-from-familysearch/
- Gramps GEDCOM 7 support: https://gramps-project.org/wiki/index.php/GEDCOM_7_support
- webtrees forum on 5.5.1 FORM vs 7 MIME: https://www.webtrees.net/index.php/forum/help-for-release-2-1-x/36799-gedcom-and-multimedia-format-media-type-form
- read-gedcom: https://github.com/arbre-app/read-gedcom , https://www.npmjs.com/package/read-gedcom
- parse-gedcom: https://www.npmjs.com/package/parse-gedcom ; gedcom: https://www.npmjs.com/package/gedcom ; @treeviz/gedcom-parser: https://www.npmjs.com/package/@treeviz/gedcom-parser ; @it9gamelog/gedcom-parser: https://www.npmjs.com/package/@it9gamelog/gedcom-parser
- awesome-gedcom: https://github.com/todrobbins/awesome-gedcom
- family-chart: https://github.com/donatso/family-chart , data format: https://github.com/donatso/family-chart/blob/master/docs/data-format.md , docs: https://donatso.github.io/family-chart/ , npm: https://www.npmjs.com/package/family-chart
- relatives-tree: https://github.com/SanichKotikov/relatives-tree
- React tree components comparison (react-d3-tree): https://blog.logrocket.com/comparing-react-tree-components/
- JS family tree libraries overview: https://dzone.com/articles/top-6-javascript-family-tree-diagram-libraries

No project files were written. This is research output only.