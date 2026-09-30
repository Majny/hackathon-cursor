// Usage: npx tsx scripts/export-sample-ged.ts [snapshot=after-s2] [out=rodokmen-novakovi.ged]
// Builds a GEDCOM from a snapshot (with Pepa's match confirmed) without touching the store.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { buildGedcom } from "../lib/gedcom";
import { resolveTree } from "../lib/treeLayout";
import type { Db } from "../lib/types";

const snap = process.argv[2] ?? "after-s2";
const out = process.argv[3] ?? "rodokmen-novakovi.ged";
const file = join(process.cwd(), "data", "snapshots", `${snap}.json`);
if (!existsSync(file)) throw new Error(`Snapshot not found: ${file}`);
const db = JSON.parse(readFileSync(file, "utf8")) as Db;
const matches = db.matches.map((m) => (m.status === "suggested" && m.band === "strong" ? { ...m, status: "confirmed" as const } : m));
const ged = buildGedcom({ ...db, tree: resolveTree(db.tree), matches }, { includeUnmatched: true });
writeFileSync(out, ged, "utf8");
console.log(`Wrote ${out} (${ged.split("\r\n").length} lines, ${matches.filter((m) => m.status === "confirmed").length} confirmed matches)`);
