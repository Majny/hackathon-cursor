import { describe, expect, it } from "vitest";
import tree from "@/data/fake-tree.json";
import type { FamilyTree } from "@/lib/types";
import { layoutTree, resolveTree } from "@/lib/treeLayout";

const T = tree as FamilyTree;

describe("layoutTree", () => {
  const L = layoutTree(T);
  it("lays out every person", () => {
    expect(L.nodes).toHaveLength(16);
    expect(L.width).toBeGreaterThan(0);
  });
  it("no overlapping cards within a generation", () => {
    const byGen = new Map<number, typeof L.nodes>();
    for (const n of L.nodes) byGen.set(n.generation, [...(byGen.get(n.generation) ?? []), n]);
    for (const row of byGen.values()) {
      const s = [...row].sort((a, b) => a.x - b.x);
      for (let i = 1; i < s.length; i++) expect(s[i].x).toBeGreaterThanOrEqual(s[i - 1].x + s[i - 1].w);
      expect(new Set(row.map((n) => n.y)).size).toBe(1);
    }
  });
  it("rows ordered by generation and spouses adjacent", () => {
    const n = new Map(L.nodes.map((x) => [x.id, x]));
    expect(n.get("I3")!.y).toBeLessThan(n.get("I1")!.y);
    expect(Math.abs(n.get("I6")!.x - n.get("I5")!.x)).toBe(n.get("I6")!.w + 28);
    expect(L.edges.some((e) => e.kind === "spouse")).toBe(true);
  });
  it("resolveTree replaces placeholder", () => {
    expect(resolveTree({ name: "x", source: "placeholder", persons: [], families: [] }).persons).toHaveLength(16);
    expect(resolveTree(T)).toBe(T);
  });
});
