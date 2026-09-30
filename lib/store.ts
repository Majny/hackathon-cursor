// FROZEN CONTRACT (WP0). Server-only persistence: Supabase app_state[STATE_ID] (JSONB) or local file.
import { promises as fs, existsSync } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Db } from "./types";

export type SnapshotName = "empty" | "after-s1" | "after-s2" | (string & {});

const TABLE = "app_state";

function storeMode(): "file" | "supabase" {
  return process.env.STORE === "file" ? "file" : "supabase";
}
function stateId(): string {
  return process.env.STATE_ID || "local";
}
function dbFilePath(): string {
  return process.env.DB_FILE || path.join(process.cwd(), "data", "db.json");
}
function snapshotPath(name: string): string {
  if (!/^[a-z0-9-]+$/i.test(name)) throw new Error(`Invalid snapshot name: ${name}`);
  return path.join(process.cwd(), "data", "snapshots", `${name}.json`);
}

export function storeInfo() {
  return { store: storeMode(), stateId: stateId() };
}

// ---------- in-process mutex ----------
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

// ---------- snapshots ----------
export async function readSnapshot(name: SnapshotName): Promise<Db> {
  const raw = await fs.readFile(snapshotPath(name), "utf8");
  return JSON.parse(raw) as Db;
}

async function defaultSeed(): Promise<Db> {
  const preferred = existsSync(snapshotPath("after-s1")) ? "after-s1" : "empty";
  return readSnapshot(preferred);
}

// ---------- file backend ----------
async function fileRead(): Promise<Db> {
  const p = dbFilePath();
  try {
    return JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ p, "utf8")) as Db;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const seed = await defaultSeed();
    await fileWrite(seed);
    return seed;
  }
}

async function fileWrite(db: Db): Promise<void> {
  const p = dbFilePath();
  await fs.mkdir(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, p);
}

// ---------- supabase backend ----------
let sb: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (sb) return sb;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing (or set STORE=file)");
  sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return sb;
}

async function sbRead(): Promise<{ data: Db; version: number }> {
  const { data, error } = await supabase().from(TABLE).select("data, version").eq("id", stateId()).maybeSingle();
  if (error) throw new Error(`Supabase read failed: ${error.message}`);
  if (data) return { data: data.data as Db, version: data.version as number };
  const seed = await defaultSeed();
  const ins = await supabase().from(TABLE).upsert({ id: stateId(), data: seed, version: 0 }, { onConflict: "id", ignoreDuplicates: true });
  if (ins.error) throw new Error(`Supabase seed failed: ${ins.error.message}`);
  const again = await supabase().from(TABLE).select("data, version").eq("id", stateId()).single();
  if (again.error) throw new Error(`Supabase read failed: ${again.error.message}`);
  return { data: again.data.data as Db, version: again.data.version as number };
}

/** Returns true when written, false on version conflict. */
async function sbWrite(db: Db, expectedVersion: number): Promise<boolean> {
  const { data, error } = await supabase()
    .from(TABLE)
    .update({ data: db, version: expectedVersion + 1, updated_at: new Date().toISOString() })
    .eq("id", stateId())
    .eq("version", expectedVersion)
    .select("id");
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

async function sbOverwrite(db: Db): Promise<void> {
  const cur = await sbRead();
  const { error } = await supabase()
    .from(TABLE)
    .upsert({ id: stateId(), data: db, version: cur.version + 1, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(`Supabase overwrite failed: ${error.message}`);
}

// ---------- public API ----------
export async function getDb(): Promise<Db> {
  if (storeMode() === "file") return fileRead();
  return (await sbRead()).data;
}

/**
 * Atomically read-modify-write the state. `fn` mutates the given db in place and returns a value.
 * `fn` may be re-run (Supabase version conflict retry) – keep it free of external side effects.
 */
export function updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  return withLock(async () => {
    if (storeMode() === "file") {
      const db = await fileRead();
      const result = await fn(db);
      await fileWrite(db);
      return result;
    }
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { data, version } = await sbRead();
      const db = structuredClone(data);
      const result = await fn(db);
      if (await sbWrite(db, version)) return result;
      lastErr = new Error("Supabase version conflict");
    }
    throw lastErr ?? new Error("updateDb failed");
  });
}

/** Replace the whole state with data/snapshots/<name>.json. */
export function loadSnapshot(name: SnapshotName): Promise<Db> {
  return withLock(async () => {
    const snap = await readSnapshot(name);
    if (storeMode() === "file") await fileWrite(snap);
    else await sbOverwrite(snap);
    return snap;
  });
}

/** Replace the whole state with the given db (used by scripts/tests). */
export function replaceDb(db: Db): Promise<void> {
  return withLock(async () => {
    if (storeMode() === "file") await fileWrite(db);
    else await sbOverwrite(db);
  });
}
