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
  for (const m of db.matches.filter((x) => x.status === "confirmed" || x.status === "suggested")) {
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

  // Featured story for the demo: how Grandpa met Grandma (the "love" chapter), if it exists.
  const love = db.chapters.find((c) => c.key === "laska");
  const loveQuote = db.turns.find((t) => t.role === "grandparent" && /dance like a steelworker/i.test(t.text));
  const wifeId = tree.persons.find((p) => p.birthSurname === "Stone")?.id ?? null;
  const featuredFocus = love && wifeId ? wifeId : null;

  return (
    <main className="mx-auto max-w-[96rem] px-5 py-10 text-[18px] sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-(family-name:--font-display) text-[2.4rem] leading-tight text-ink sm:text-[2.8rem]">Family tree</h1>
          <p className="mt-2 max-w-[55ch] text-[1.2rem] leading-[1.6] text-ink-soft">
            People Grandpa talks about are marked in green. Tap a name.
          </p>
          <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[1.05rem] text-ink">
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-4 w-4 rounded border-2 border-moss bg-moss/10" />
              In Grandpa’s stories
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-4 w-4 rounded border border-line bg-paper" />
              Not mentioned yet
            </li>
          </ul>
        </div>
        <a
          href="/api/export/gedcom?includeUnmatched=0"
          className="inline-flex min-h-12 items-center rounded-xl border border-brick/40 px-5 text-[1.05rem] font-semibold text-brick hover:bg-brick hover:text-paper"
        >
          Download for MyHeritage / FamilySearch
        </a>
      </div>
      {love && (
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-brick/30 bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[0.95rem] font-semibold tracking-wide text-brick uppercase">Featured story · 1968</p>
            <h2 className="mt-1 font-(family-name:--font-display) text-[1.8rem] leading-tight text-ink">How Grandpa met Grandma</h2>
            {loveQuote && (
              <p className="mt-2 max-w-[48ch] font-serif text-[1.2rem] italic text-ink">
                “Jerry, you dance like a steelworker.” <span className="not-italic text-ink-soft">— Mary, at a dance in Kladno</span>
              </p>
            )}
          </div>
          <a
            href={`/family/stories#${love.id}`}
            className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-ink px-6 text-[1.05rem] font-semibold text-paper hover:bg-brick"
          >
            Read “{love.title}”
          </a>
        </section>
      )}
      <FamilyTree
        tree={tree}
        layout={layoutTree(tree)}
        confirmedByTreeId={confirmedByTreeId}
        suggestedTreeIds={suggestedTreeIds}
        grandparentTreeId={db.grandparent.treePersonId}
        relatives={relatives}
        initialFocus={focus && tree.persons.some((p) => p.id === focus) ? focus : featuredFocus}
      />
      <details className="mt-6 text-[1rem] text-ink-soft">
        <summary className="cursor-pointer">Details about the download</summary>
        <p className="mt-2 max-w-[60ch]">
          The file is a standard GEDCOM 5.5.1 file (UTF-8). MyHeritage, Geni and FamilySearch can import it. Grandpa’s own words are attached to each person as notes.
        </p>
      </details>
    </main>
  );
}
