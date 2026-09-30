import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import { GRANDCHILD_TEMPLATE, GRANDCHILD_VARIABLES, buildDynamicVariables, renderGrandchildPrompt } from "@/lib/prompts/grandchild";
import { buildMemory } from "@/lib/memory";
import { buildChapterUser, renderChapterSystem } from "@/lib/prompts/chapter";
import { renderExtractorSystem } from "@/lib/prompts/extractor";
import { formatTranscript } from "@/lib/prompts/transcript";
import type { Db, Turn } from "@/lib/types";

async function emptyDb(): Promise<Db> {
  return JSON.parse(await fs.readFile(path.join(process.cwd(), "data/snapshots/empty.json"), "utf8"));
}

describe("grandchild prompt", () => {
  it("template placeholders == GRANDCHILD_VARIABLES", () => {
    const found = [...new Set([...GRANDCHILD_TEMPLATE.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))].sort();
    expect(found).toEqual([...GRANDCHILD_VARIABLES].sort());
  });
  it("buildDynamicVariables returns all keys non-empty; render leaves no {{", async () => {
    const mem = buildMemory(await emptyDb());
    const vars = buildDynamicVariables(mem);
    for (const k of GRANDCHILD_VARIABLES) expect(vars[k]?.trim().length).toBeGreaterThan(0);
    expect(Object.keys(vars).sort()).toEqual([...GRANDCHILD_VARIABLES].sort());
    const rendered = renderGrandchildPrompt(mem);
    expect(rendered).not.toContain("{{");
    expect(rendered).toContain("Tomáš");
  });
});

describe("pipeline prompts", () => {
  const turns: Turn[] = [
    { id: "s1-t01", sessionId: "s1", idx: 1, clientSeq: 1, role: "grandparent", text: "Na Kladně.", at: "" },
    { id: "s1-t02", sessionId: "s1", idx: 2, clientSeq: 2, role: "ai", text: "A kdo tam byl?", at: "" },
  ];
  it("transcript format", () => {
    expect(formatTranscript(turns)).toBe("[s1-t01] DĚDA: Na Kladně.\n[s1-t02] VNUK: A kdo tam byl?");
  });
  it("chapter user separates questions", () => {
    const u = buildChapterUser({ turns, keyFacts: [] });
    const [src, rest] = u.split("OTÁZKY – NEJSOU ZDROJ");
    expect(src).toContain("[s1-t01] DĚDA");
    expect(src).not.toContain("s1-t02");
    expect(rest).toContain("[s1-t02] VNUK");
    expect(renderChapterSystem("Dětství")).toContain("„Dětství“");
    expect(renderExtractorSystem({ birthYear: 1946, birthPlace: "Kladno" })).not.toContain("{{");
  });
});
