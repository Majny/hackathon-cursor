// Demo helper: switch the Czech demo family to English names (files + stored state for STATE_ID).
import fs from "node:fs";
import path from "node:path";
import { updateDb } from "@/lib/store";

const PAIRS: [RegExp | string, string][] = [
  ["Jan Novák", "John Miller"],
  ["Novákových", "Miller"], ["Nováková", "Miller"], ["Nováků", "Millers"], ["Novák", "Miller"],
  ["Dvořáková", "Walker"], ["Dvořák", "Walker"],
  ["Svobodová", "Stone"], ["Svoboda", "Stone"],
  ["Horáková", "Hill"], ["Horák", "Hill"],
  ["Černá", "Black"], ["Černý", "Black"],
  ["Jaroslav", "Jerry"], ["Jarda", "Jerry"], ["Jardo", "Jerry"],
  ["František", "Frank"], ["Věrka", "Vera"], ["Věra", "Vera"], ["Kateřina", "Kate"],
  [/\bMarie\b/g, "Mary"], [/\bLucie\b/g, "Lucy"], [/\bKarel\b/g, "Charles"], [/\bJan\b(?=[ "])/g, "John"],
];
const rename = (s: string) => PAIRS.reduce((acc, [a, b]) => (typeof a === "string" ? acc.split(a).join(b) : acc.replace(a, b)), s);

const skip = (f: string) => f.includes("tinder") || f.includes(`lib${path.sep}matching`) || f.endsWith("matching.test.ts");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(tsx?|json)$/.test(p) ? [p] : [];
  });
if (process.argv.includes("--files")) {
  for (const f of ["app", "components", "lib", "data", "tests"].flatMap(walk).filter((f) => !skip(f))) {
    const before = fs.readFileSync(f, "utf8");
    const after = rename(before);
    if (after !== before) fs.writeFileSync(f, after);
  }
  console.log("files renamed");
}
if (process.argv.includes("--db")) {
  await updateDb((db) => { Object.assign(db, JSON.parse(rename(JSON.stringify(db)))); });
  console.log("db renamed for", process.env.STATE_ID);
}
