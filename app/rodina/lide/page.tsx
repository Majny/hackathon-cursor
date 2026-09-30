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
          <h1 className="text-3xl font-semibold">Lidé z vyprávění</h1>
          <p className="text-ink-soft">
            Koho děda zmínil a jestli je to někdo z rodokmenu. Shodu vždy potvrzuje rodina.
          </p>
        </div>
        <RecomputeButton />
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-6 text-ink-soft">
          Zatím žádné návrhy shod se stromem.
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
        title="Lidé"
        rows={db.persons}
        rowKey={(p) => p.id}
        empty="Zatím nikdo."
        columns={[
          { header: "Jméno", cell: (p) => <strong>{p.mentionName}</strong> },
          { header: "Vztah", cell: (p) => p.relationToGrandparent },
          { header: "Rok", cell: (p) => (p.birthYear ? `${p.birthYearApprox ? "asi " : ""}${p.birthYear}` : "–") },
          { header: "Místo", cell: (p) => p.place ?? "–" },
          {
            header: "Ve stromě",
            cell: (p) => {
              const m = matchByEntity.get(p.id);
              const t = m ? treeById.get(m.treePersonId) : undefined;
              if (!m || !t) return <span className="text-ink-soft">–</span>;
              return `${t.givenName} ${t.surname}${m.status === "suggested" ? " (návrh)" : " ✓"}`;
            },
          },
          { header: "Zdroj", cell: (p) => <TurnLinks turnIds={p.turnIds} /> },
        ]}
      />

      <EntityTable
        title="Místa"
        rows={db.places}
        rowKey={(p) => p.id}
        empty="Zatím žádná místa."
        columns={[
          { header: "Místo", cell: (p) => <strong>{p.name}</strong> },
          { header: "Souvislost", cell: (p) => p.context },
          { header: "Zdroj", cell: (p) => <TurnLinks turnIds={p.turnIds} /> },
        ]}
      />

      <EntityTable
        title="Události"
        rows={events}
        rowKey={(e) => e.id}
        empty="Zatím žádné události."
        columns={[
          { header: "Rok", cell: (e) => (e.year ? `${e.yearApprox ? "asi " : ""}${e.year}` : "–") },
          { header: "Událost", cell: (e) => <><strong>{e.title}</strong><div className="text-ink-soft">{e.description}</div></> },
          {
            header: "Kdo a kde",
            cell: (e) =>
              [
                ...e.personIds.map((id) => persons.get(id)?.mentionName ?? id),
                ...e.placeIds.map((id) => placesById.get(id)?.name ?? id),
              ].join(", ") || "–",
          },
          { header: "Zdroj", cell: (e) => <TurnLinks turnIds={e.turnIds} /> },
        ]}
      />
    </main>
  );
}
