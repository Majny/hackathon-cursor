import { beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getDb, updateDb, loadSnapshot, readSnapshot } from "@/lib/store";
import { DbSchema, SessionSummarySchema, ExtractionSchema, ChapterSchema } from "@/lib/schemas";
import { llmStructured } from "@/lib/llm";

let file: string;

beforeEach(async () => {
  process.env.STORE = "file";
  process.env.MOCK_AI = "1";
  file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "store-test-")), "db.json");
  process.env.DB_FILE = file;
});

describe("store (file mode)", () => {
  it("auto-seeds when db file is missing", async () => {
    const db = await getDb();
    expect(db.version).toBe(1);
    expect(db.grandparent.fullName).toBe("Jerry Miller");
    await expect(fs.stat(file)).resolves.toBeTruthy();
  });

  it("20 parallel updateDb calls lose no write", async () => {
    await loadSnapshot("empty");
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        updateDb((db) => {
          db.places.push({ id: `pl-${i}`, name: `Místo ${i}`, context: "", turnIds: [] });
        }),
      ),
    );
    const db = await getDb();
    expect(db.places).toHaveLength(20);
    expect(new Set(db.places.map((p) => p.id)).size).toBe(20);
  });

  it("updateDb returns fn value and persists; async fn works", async () => {
    await loadSnapshot("empty");
    const n = await updateDb(async (db) => {
      await new Promise((r) => setTimeout(r, 5));
      db.grandparent.displayName = "děda Jára";
      return 42;
    });
    expect(n).toBe(42);
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    expect(raw.grandparent.displayName).toBe("děda Jára");
  });

  it("a throwing fn does not break the mutex", async () => {
    await loadSnapshot("empty");
    await expect(updateDb(() => { throw new Error("boom"); })).rejects.toThrow("boom");
    await updateDb((db) => { db.places.push({ id: "ok", name: "ok", context: "", turnIds: [] }); });
    expect((await getDb()).places).toHaveLength(1);
  });

  it("loadSnapshot replaces state", async () => {
    await updateDb((db) => { db.places.push({ id: "x", name: "x", context: "", turnIds: [] }); });
    await loadSnapshot("empty");
    const db = await getDb();
    expect(db.places).toHaveLength(0);
    expect(db).toEqual(await readSnapshot("empty"));
  });
});

describe("snapshots & fixtures", () => {
  it("empty snapshot validates against DbSchema", async () => {
    const snap = await readSnapshot("empty");
    expect(() => DbSchema.parse(snap)).not.toThrow();
  });

  it("fixtures validate via llmStructured MOCK_AI path", async () => {
    const s = await llmStructured({ task: "summary", schema: SessionSummarySchema, system: "", user: "" });
    expect(s.provider).toBe("mock");
    expect(s.data.nextSessionOpener).toContain("fair in Prague");
    const e = await llmStructured({ task: "extract", schema: ExtractionSchema, system: "", user: "" });
    expect(e.data.persons.find((p) => p.surname === "Walker")?.birthYear).toBe(1948);
    const c = await llmStructured({ task: "chapter", schema: ChapterSchema, system: "", user: "", writer: true });
    expect(c.data.paragraphs.length).toBeGreaterThanOrEqual(3);
  });
});
