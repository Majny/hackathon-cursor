// Pure layout of a FamilyTree into rows by generation (PLAN §11.6). No I/O, no React.
import type { FamilyTree, TreeFamily } from "./types";

export interface LayoutNode { id: string; x: number; y: number; w: number; h: number; generation: number }
export interface LayoutEdge { id: string; kind: "spouse" | "child"; d: string }
export interface TreeLayout { nodes: LayoutNode[]; edges: LayoutEdge[]; width: number; height: number }
export interface LayoutOptions { cardW?: number; cardH?: number; gapX?: number; gapY?: number; pad?: number }

export function layoutTree(tree: FamilyTree, opts: LayoutOptions = {}): TreeLayout {
  const W = opts.cardW ?? 170;
  const H = opts.cardH ?? 84;
  const GX = opts.gapX ?? 28;
  const GY = opts.gapY ?? 90;
  const PAD = opts.pad ?? 20;

  const gens = [...new Set(tree.persons.map((p) => p.generation))].sort((a, b) => a - b);
  const genOf = new Map(tree.persons.map((p) => [p.id, p.generation]));
  const parentFams = (id: string) => tree.families.filter((f) => f.childIds.includes(id));
  const spouseOf = (id: string): string[] =>
    tree.families
      .filter((f) => f.husbandId === id || f.wifeId === id)
      .map((f) => (f.husbandId === id ? f.wifeId : f.husbandId))
      .filter((x): x is string => !!x && genOf.get(x) === genOf.get(id));

  const xs = new Map<string, number>(); // center x
  const order = new Map<number, string[]>();

  /** Place units left→right at their desired center (if any), never overlapping. */
  const place = (g: number, units: { u: string[]; k: number }[]) => {
    order.set(g, units.flatMap((x) => x.u));
    let next = PAD + W / 2; // min center for the next card
    for (const { u, k } of units) {
      const span = (u.length - 1) * (W + GX);
      const want = Number.isFinite(k) ? k - span / 2 : next;
      let c = Math.max(next, want);
      for (const id of u) {
        xs.set(id, c);
        c += W + GX;
      }
      next = c;
    }
  };

  /** Group row into units (spouses adjacent, husband first) and sort by key. */
  const arrange = (g: number, key: (id: string) => number) => {
    const ids = tree.persons.filter((p) => p.generation === g).map((p) => p.id);
    const seen = new Set<string>();
    const units: string[][] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      const unit = [id, ...spouseOf(id).filter((s) => !seen.has(s))];
      unit.forEach((u) => seen.add(u));
      // husband left
      unit.sort((a, b) => (tree.families.some((f) => f.husbandId === a && f.wifeId === b) ? -1 : tree.families.some((f) => f.husbandId === b && f.wifeId === a) ? 1 : 0));
      units.push(unit);
    }
    const unitKey = (u: string[]) => {
      const ks = u.map(key).filter((k) => Number.isFinite(k));
      return ks.length ? ks.reduce((a, b) => a + b, 0) / ks.length : Number.POSITIVE_INFINITY;
    };
    const keyed = units.map((u, i) => ({ u, k: unitKey(u), i }));
    keyed.sort((a, b) => a.k - b.k || a.i - b.i);
    place(g, keyed);
  };

  const parentKey = (id: string) => {
    const px = parentFams(id)
      .flatMap((f) => [f.husbandId, f.wifeId])
      .filter((x): x is string => !!x && xs.has(x))
      .map((x) => xs.get(x)!);
    return px.length ? px.reduce((a, b) => a + b, 0) / px.length : NaN;
  };
  const childKey = (id: string) => {
    const cx = tree.families
      .filter((f) => f.husbandId === id || f.wifeId === id)
      .flatMap((f) => f.childIds)
      .filter((c) => xs.has(c))
      .map((c) => xs.get(c)!);
    if (cx.length) return cx.reduce((a, b) => a + b, 0) / cx.length;
    // no children: sit next to siblings
    const sib = parentFams(id).flatMap((f) => f.childIds).filter((c) => c !== id && xs.has(c)).map((c) => xs.get(c)! - 1);
    return sib.length ? Math.min(...sib) : NaN;
  };

  // pass 1: top-down, input order for the first row
  gens.forEach((g, i) => arrange(g, i === 0 ? () => NaN : parentKey));
  // pass 2: re-sort top row by children / siblings, then top-down again
  if (gens.length) {
    const first = gens[0];
    arrange(first, childKey);
    // second refinement for persons keyed by siblings
    arrange(first, childKey);
    gens.slice(1).forEach((g) => arrange(g, parentKey));
  }

  const minX = Math.min(...[...xs.values()]) - W / 2;
  const shift = Number.isFinite(minX) ? minX - PAD : 0;
  const rowIndex = new Map(gens.map((g, i) => [g, i]));
  const nodes: LayoutNode[] = tree.persons.map((p) => ({
    id: p.id,
    x: xs.get(p.id)! - W / 2 - shift,
    y: PAD + rowIndex.get(p.generation)! * (H + GY),
    w: W,
    h: H,
    generation: p.generation,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges: LayoutEdge[] = [];
  for (const f of tree.families) edges.push(...familyEdges(f, byId));

  const width = Math.max(...nodes.map((n) => n.x + n.w), 0) + PAD;
  const height = Math.max(...nodes.map((n) => n.y + n.h), 0) + PAD;
  return { nodes, edges, width, height };
}

function familyEdges(f: TreeFamily, byId: Map<string, LayoutNode>): LayoutEdge[] {
  const out: LayoutEdge[] = [];
  const h = f.husbandId ? byId.get(f.husbandId) : undefined;
  const w = f.wifeId ? byId.get(f.wifeId) : undefined;
  const parents = [h, w].filter((x): x is LayoutNode => !!x);
  if (h && w) {
    const [l, r] = h.x < w.x ? [h, w] : [w, h];
    const y = l.y + l.h / 2;
    out.push({ id: `${f.id}-sp`, kind: "spouse", d: `M${l.x + l.w},${y} L${r.x},${y}` });
  }
  const kids = f.childIds.map((c) => byId.get(c)).filter((x): x is LayoutNode => !!x);
  if (!kids.length) return out;
  let sx: number;
  let sy: number;
  if (parents.length === 2) {
    sx = (parents[0].x + parents[0].w / 2 + parents[1].x + parents[1].w / 2) / 2;
    sy = parents[0].y + parents[0].h / 2;
  } else if (parents.length === 1) {
    sx = parents[0].x + parents[0].w / 2;
    sy = parents[0].y + parents[0].h;
  } else {
    // siblings without known parents: bracket over the children
    const top = Math.min(...kids.map((k) => k.y)) - 16;
    const xsK = kids.map((k) => k.x + k.w / 2);
    out.push({ id: `${f.id}-sib`, kind: "child", d: `M${Math.min(...xsK)},${top} L${Math.max(...xsK)},${top}` });
    for (const k of kids) out.push({ id: `${f.id}-${k.id}`, kind: "child", d: `M${k.x + k.w / 2},${top} L${k.x + k.w / 2},${k.y}` });
    return out;
  }
  for (const k of kids) {
    const kx = k.x + k.w / 2;
    const midY = k.y - 24;
    out.push({ id: `${f.id}-${k.id}`, kind: "child", d: `M${sx},${sy} L${sx},${midY} L${kx},${midY} L${kx},${k.y}` });
  }
  return out;
}

import fakeTree from "../data/fake-tree.json";

/** The full demo tree (data/fake-tree.json). */
export const FAKE_TREE = fakeTree as FamilyTree;

/** Replace a placeholder/partial store tree with the full demo tree. */
export function resolveTree(tree: FamilyTree | null | undefined): FamilyTree {
  if (!tree || tree.persons.length < FAKE_TREE.persons.length || /placeholder/i.test(tree.source)) return FAKE_TREE;
  return tree;
}
