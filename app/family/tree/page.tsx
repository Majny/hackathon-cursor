import { getDb } from "@/lib/store";
import { layoutTree, resolveTree } from "@/lib/treeLayout";
import type { Citation, PersonEntity } from "@/lib/types";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { describeRelatives } from "@/components/people/relatives";

export const dynamic = "force-dynamic";

export default async function TreePage({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams;
  const db = await getDb();
  const tree = resolveTree(db.tree);
  const turns = new Map(db.turns.map((t) => [t.id, t]));
  const confirmedByTreeId: Record<string, { entity: PersonEntity; citations: Citation[] }> = {};
  for (const m of db.matches.filter((x) => x.status === "confirmed")) {
    const entity = db.persons.find((p) => p.id === m.entityId);
    if (!entity) continue;
    const citations = entity.turnIds.flatMap((id) => {
      const t = turns.get(id);
      return t ? [{ turnId: id, quote: t.text.slice(0, 160) }] : [];
    });
    confirmedByTreeId[m.treePersonId] = { entity, citations };
  }
  const suggestedTreeIds = db.matches.filter((m) => m.status === "suggested").map((m) => m.treePersonId);
  const relatives = Object.fromEntries(tree.persons.map((p) => [p.id, describeRelatives(tree, p.id)]));

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-4xl font-medium tracking-tight text-ink">Family tree</h1>
          <p className="text-ink-soft">
            {tree.name}. People outlined in green appear in Grandpa Jarda’s stories.
          </p>
        </div>
        <a
          href="/api/export/gedcom?includeUnmatched=0"
          className="inline-flex items-center rounded-xl bg-brick px-5 py-3 text-lg font-medium text-white hover:bg-brick-dark"
        >
          Download GEDCOM
        </a>
      </div>
      <FamilyTree
        tree={tree}
        layout={layoutTree(tree)}
        confirmedByTreeId={confirmedByTreeId}
        suggestedTreeIds={suggestedTreeIds}
        grandparentTreeId={db.grandparent.treePersonId}
        relatives={relatives}
        initialFocus={focus && tree.persons.some((p) => p.id === focus) ? focus : null}
      />
      <p className="mt-4 text-sm text-ink-soft">
        GEDCOM 5.5.1 (UTF-8) imports into MyHeritage, Geni or FamilySearch. Quotes from the calls are attached as notes.
      </p>
    </main>
  );
}
