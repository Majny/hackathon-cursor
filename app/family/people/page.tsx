import { getDb } from "@/lib/store";
import { resolveTree } from "@/lib/treeLayout";
import type { Citation, Match } from "@/lib/types";
import { MatchCard } from "@/components/people/MatchCard";
import { RecomputeButton } from "@/components/people/RecomputeButton";
import { EntityTable, TurnLinks } from "@/components/people/EntityTable";
import { describeRelatives } from "@/components/people/relatives";

export const dynamic = "force-dynamic";

const ORDER: Record<Match["status"], number> = { suggested: 0, confirmed: 1, rejected: 2 };

export default async function PeoplePage() {
  const db = await getDb();
  const tree = resolveTree(db.tree);
  const turns = new Map(db.turns.map((t) => [t.id, t]));
  const persons = new Map(db.persons.map((p) => [p.id, p]));
  const treeById = new Map(tree.persons.map((p) => [p.id, p]));
  const placesById = new Map(db.places.map((p) => [p.id, p]));
  const alsoNames = Object.fromEntries(tree.persons.map((p) => [p.id, `${p.givenName} ${p.surname}`]));
  const citationsFor = (turnIds: string[]): Citation[] =>
    turnIds.flatMap((id) => {
      const t = turns.get(id);
      return t ? [{ turnId: id, quote: t.text.slice(0, 160) }] : [];
    });
  const matches = [...db.matches].sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.score - a.score);
  const matchByEntity = new Map(db.matches.filter((m) => m.status !== "rejected").map((m) => [m.entityId, m]));
  const events = [...db.events].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">People in the stories</h1>
          <p className="text-ink-soft">
            Everyone Grandpa mentioned, and whether they’re someone in the family tree. The family always has the final say on a match.
          </p>
        </div>
        <RecomputeButton />
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-ink-soft">
          No suggested tree matches yet.
        </p>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => {
            const entity = persons.get(m.entityId) ?? null;
            return (
              <MatchCard
                key={m.id}
                match={m}
                entity={entity}
                treePerson={treeById.get(m.treePersonId) ?? null}
                relatives={describeRelatives(tree, m.treePersonId)}
                citations={citationsFor(entity?.turnIds ?? [])}
                alsoNames={alsoNames}
              />
            );
          })}
        </div>
      )}

      <EntityTable
        title="People"
        rows={db.persons}
        rowKey={(p) => p.id}
        empty="Nobody yet."
        columns={[
          { header: "Name", cell: (p) => <strong>{p.mentionName}</strong> },
          { header: "Relation", cell: (p) => p.relationToGrandparent },
          { header: "Born", cell: (p) => (p.birthYear ? `${p.birthYearApprox ? "c. " : ""}${p.birthYear}` : "–") },
          { header: "Place", cell: (p) => p.place ?? "–" },
          {
            header: "In the tree",
            cell: (p) => {
              const m = matchByEntity.get(p.id);
              const t = m ? treeById.get(m.treePersonId) : undefined;
              if (!m || !t) return <span className="text-ink-soft">–</span>;
              return `${t.givenName} ${t.surname}${m.status === "suggested" ? " (suggested)" : " ✓"}`;
            },
          },
          { header: "Source", cell: (p) => <TurnLinks turnIds={p.turnIds} /> },
        ]}
      />

      <EntityTable
        title="Places"
        rows={db.places}
        rowKey={(p) => p.id}
        empty="No places yet."
        columns={[
          { header: "Place", cell: (p) => <strong>{p.name}</strong> },
          { header: "Context", cell: (p) => p.context },
          { header: "Source", cell: (p) => <TurnLinks turnIds={p.turnIds} /> },
        ]}
      />

      <EntityTable
        title="Events"
        rows={events}
        rowKey={(e) => e.id}
        empty="No events yet."
        columns={[
          { header: "Year", cell: (e) => (e.year ? `${e.yearApprox ? "c. " : ""}${e.year}` : "–") },
          { header: "Event", cell: (e) => <><strong>{e.title}</strong><div className="text-ink-soft">{e.description}</div></> },
          {
            header: "Who & where",
            cell: (e) =>
              [
                ...e.personIds.map((id) => persons.get(id)?.mentionName ?? id),
                ...e.placeIds.map((id) => placesById.get(id)?.name ?? id),
              ].join(", ") || "–",
          },
          { header: "Source", cell: (e) => <TurnLinks turnIds={e.turnIds} /> },
        ]}
      />
    </main>
  );
}
