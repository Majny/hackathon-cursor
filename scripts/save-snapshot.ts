// Save the current store state as data/snapshots/<name>.json (validated by DbSchema).
// Usage:  STORE=file npx tsx scripts/save-snapshot.ts after-s2-live
//         (Supabase: run with SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/STATE_ID in env, e.g. `node --env-file=.env.local --import tsx scripts/save-snapshot.ts after-s2-live`)
import { promises as fs } from "fs";
import path from "path";
import { getDb } from "../lib/store";
import { DbSchema } from "../lib/schemas";

async function main() {
  const name = process.argv[2];
  if (!name || !/^[a-z0-9-]+$/i.test(name)) {
    console.error("Usage: tsx scripts/save-snapshot.ts <name>   (name: [a-z0-9-]+)");
    process.exit(1);
  }
  if (["empty", "after-s1", "after-s2"].includes(name) && !process.argv.includes("--force")) {
    console.error(`Refusing to overwrite curated snapshot "${name}" without --force.`);
    process.exit(1);
  }
  const db = await getDb();
  const parsed = DbSchema.safeParse(db);
  if (!parsed.success) {
    console.error("Current state does not validate against DbSchema:");
    console.error(parsed.error.issues.slice(0, 10));
    process.exit(1);
  }
  const file = path.join(process.cwd(), "data", "snapshots", `${name}.json`);
  await fs.writeFile(file, JSON.stringify(db, null, 2) + "\n", "utf8");
  console.log(`Saved ${file}: ${db.sessions.length} sessions, ${db.turns.length} turns, ${db.chapters.length} chapters, ${db.matches.length} matches`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
