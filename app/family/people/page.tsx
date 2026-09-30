import Link from "next/link";
import { getDb } from "@/lib/store";
import { getPeople, getPersonProfile, initials, routes, type PersonCardVM, type QuoteRef } from "@/lib/archive";
import { resolveTree } from "@/lib/treeLayout";
import type { Db } from "@/lib/types";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { MatchCard } from "@/components/people/MatchCard";
import { RecomputeButton } from "@/components/people/RecomputeButton";
import { describeRelatives } from "@/components/people/relatives";
import { Avatar, Chip, TreeBadge, cardCls, display, focusRing, EmptyNote } from "@/components/archive/people/kit";
import { PeopleConstellation } from "@/components/archive/people/PeopleConstellation";

export const dynamic = "force-dynamic";

type FilterKey = "all" | "family" | "friends" | "in-tree" | "review" | "not-in-tree" | "gen-parents" | "gen-his" | "gen-children";
type Gen = "gen-parents" | "gen-his" | "gen-children" | null;

const FILTERS: { key: FilterKey; label: string; group: "who" | "tree" | "gen" }[] = [
  { key: "all", label: "Everyone", group: "who" },
  { key: "family", label: "Family", group: "who" },
  { key: "friends", label: "Friends", group: "who" },
  { key: "in-tree", label: "In the tree", group: "tree" },
  { key: "review", label: "Needs review", group: "tree" },
  { key: "not-in-tree", label: "Not in tree yet", group: "tree" },
  { key: "gen-parents", label: "His parents’ generation", group: "gen" },
  { key: "gen-his", label: "His generation", group: "gen" },
  { key: "gen-children", label: "His children’s generation", group: "gen" },
];

/** Local helper: generation relative to Grandpa, from the linked tree person. */
function generationOf(db: Db, p: PersonCardVM): Gen {
  const me = db.tree.persons.find((x) => x.id === db.grandparent.treePersonId);
  if (!me || !p.treePerson) return null;
  const d = p.treePerson.generation - me.generation;
  return d < 0 ? "gen-parents" : d === 0 ? "gen-his" : "gen-children";
}

function matches(db: Db, p: PersonCardVM, f: FilterKey): boolean {
  switch (f) {
    case "all":
      return true;
    case "family":
    case "friends":
      return p.group === f;
    case "in-tree":
      return p.treeStatus === "confirmed" || p.treeStatus === "inferred" || p.treeStatus === "suggested";
    case "review":
      return p.treeStatus === "suggested";
    case "not-in-tree":
      return p.treeStatus === "none";
    default:
      return generationOf(db, p) === f;
  }
}

function href(filter: FilterKey, view: "cards" | "table") {
  const q = new URLSearchParams();
  if (filter !== "all") q.set("filter", filter);
  if (view !== "cards") q.set("view", view);
  const s = q.toString();
  return s ? `${routes.people()}?${s}` : routes.people();
}

const callsText = (c: number[]) => (c.length === 0 ? "" : c.length === 1 ? `call ${c[0]}` : `calls ${c.join(", ")}`);
const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ filter?: string; view?: string }> }) {
  const sp = await searchParams;
  const db = await getDb();
  const people = getPeople(db);
  const filter: FilterKey = FILTERS.some((f) => f.key === sp.filter) ? (sp.filter as FilterKey) : "all";
  const view: "cards" | "table" = sp.view === "table" ? "table" : "cards";
  const shown = people.filter((p) => matches(db, p, filter));
  const quoteOf = new Map<string, QuoteRef | null>(
    people.map((p) => [p.id, getPersonProfile(db, p.id)?.quotes.find((q) => q.role === "grandparent") ?? null]),
  );

  const tree = resolveTree(db.tree);
  const treeById = new Map(tree.persons.map((p) => [p.id, p]));
  const personsById = new Map(db.persons.map((p) => [p.id, p]));
  const turns = new Map(db.turns.map((t) => [t.id, t]));
  const alsoNames = Object.fromEntries(tree.persons.map((p) => [p.id, `${p.givenName} ${p.surname}`]));
  const pending = db.matches.filter((m) => m.status === "suggested").sort((a, b) => b.score - a.score);
  const gp = db.grandparent;

  const counts = new Map(FILTERS.map((f) => [f.key, people.filter((p) => matches(db, p, f.key)).length]));
  const visibleFilters = FILTERS.filter((f) => f.key === "all" || f.key === filter || (counts.get(f.key) ?? 0) > 0);

  return (
    <main>
      <header className="pb-8 pt-2">
        <SectionLabel num="04">People in his stories</SectionLabel>
        <h1 className={`${display} text-[2.6rem] leading-[1.05] tracking-tight sm:text-[3.3rem]`}>
          Everyone he <em className="italic text-brick">remembers</em>
        </h1>
        <p className="mt-3 max-w-[60ch] text-[1.1rem] leading-relaxed text-ink-soft">
          {people.length} people Grandpa has talked about so far, each linked to his own words and, where we can, to the family tree. The family
          always has the final say on a match.
        </p>
      </header>

      {people.length > 0 && (
        <section aria-label="Who Grandpa talks about most" className="mb-10">
          <PeopleConstellation people={people} centerLabel={gp.displayName} centerInitials={initials(gp.fullName)} />
        </section>
      )}

      <div className="mb-6 py-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Filter people" className="flex flex-wrap items-center gap-2.5">
            {visibleFilters.map((f, i) => (
              <span key={f.key} className="contents">
                {i > 0 && visibleFilters[i - 1].group !== f.group && <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:inline-block" />}
                <Chip href={href(f.key, view)} active={filter === f.key} count={counts.get(f.key)}>
                  {f.label}
                </Chip>
              </span>
            ))}
          </div>
          <div role="group" aria-label="Layout" className="inline-flex rounded-full border border-line bg-card p-1">
            {(["cards", "table"] as const).map((v) => (
              <Link
                key={v}
                href={href(filter, v)}
                scroll={false}
                aria-current={view === v ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-full px-4 text-[0.95rem] ${focusRing} ${view === v ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              >
                {v === "cards" ? "Cards" : "Table"}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyNote>Nobody here yet. Tom will keep asking, and new people will appear after the next call.</EmptyNote>
      ) : view === "cards" ? (
        <ul className="grid gap-5 md:grid-cols-2">
          {shown.map((p) => {
            const q = quoteOf.get(p.id);
            return (
              <li key={p.id}>
                <Link
                  href={p.href}
                  className={`${cardCls} group flex h-full flex-col gap-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-brick/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
                >
                  <div className="flex items-start gap-4">
                    <Avatar initials={p.initials} tone={p.treeStatus === "none" ? "neutral" : p.group === "family" ? "brick" : "moss"} size={60} />
                    <div className="min-w-0 flex-1">
                      <h2 className={`${display} text-[1.55rem] leading-tight group-hover:text-brick-dark`}>{p.name}</h2>
                      <p className="mt-0.5 text-ink-soft">{capitalize(p.relation)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.95rem]">
                    <TreeBadge status={p.treeStatus} />
                    {p.treePerson && (
                      <span className="text-ink-soft">
                        {p.treeStatus === "suggested" ? "probably " : ""}
                        {p.treePerson.givenName} {p.treePerson.surname}
                      </span>
                    )}
                  </div>
                  {q && (
                    <blockquote className={`${display} border-l-2 border-brick/40 pl-3 text-[1.05rem] italic leading-relaxed text-ink`}>
                      “{q.quote.length > 120 ? `${q.quote.slice(0, 118).replace(/\s+\S*$/, "")}…` : q.quote}”
                    </blockquote>
                  )}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[0.92rem] text-ink-soft">
                    <span>
                      {[p.years ? `born ${p.years}` : null, p.place].filter(Boolean).join(" · ") || "Year unknown. Tom will ask."}
                    </span>
                    <span>
                      <strong className="text-ink">mentioned {p.mentionCount}×</strong>
                      {p.callsMentioned.length ? ` · ${callsText(p.callsMentioned)}` : ""}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-paper-dark text-[0.78rem] uppercase tracking-[0.14em] text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Relation</th>
                <th className="px-4 py-3 font-semibold">Born</th>
                <th className="px-4 py-3 font-semibold">Place</th>
                <th className="px-4 py-3 text-right font-semibold">Mentioned</th>
                <th className="px-4 py-3 font-semibold">Calls</th>
                <th className="px-4 py-3 font-semibold">Family tree</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p, i) => (
                <tr key={p.id} className={`border-t border-line align-middle ${i % 2 ? "bg-paper/60" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={p.href} className={`inline-flex min-h-11 items-center gap-3 font-semibold text-ink hover:text-brick ${focusRing}`}>
                      <Avatar initials={p.initials} size={36} tone={p.treeStatus === "none" ? "neutral" : "brick"} />
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{capitalize(p.relation)}</td>
                  <td className="px-4 py-3 tabular-nums">{p.years || <span className="text-ink-soft">unknown</span>}</td>
                  <td className="px-4 py-3">{p.place ?? <span className="text-ink-soft">unknown</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.mentionCount}×</td>
                  <td className="px-4 py-3 tabular-nums">{p.callsMentioned.join(", ")}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <TreeBadge status={p.treeStatus} />
                      {p.treePerson && (
                        <span className="text-sm text-ink-soft">
                          {p.treePerson.givenName} {p.treePerson.surname} ({p.treePerson.id})
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section aria-labelledby="pending-h" className="mt-16 border-t border-line pt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel num="✓">Needs a family member to confirm</SectionLabel>
            <h2 id="pending-h" className={`${display} text-[1.8rem] leading-tight`}>
              Is this the right person in the tree?
            </h2>
            <p className="mt-1 max-w-[60ch] text-ink-soft">
              We compare what Grandpa said (names, nicknames, years, places) with the family tree. Nothing is linked for certain until someone
              in the family says yes.
            </p>
          </div>
          <RecomputeButton />
        </div>
        {pending.length === 0 ? (
          <EmptyNote>Every suggested match has been checked. Thank you!</EmptyNote>
        ) : (
          <div className="space-y-5">
            {pending.map((m) => {
              const entity = personsById.get(m.entityId) ?? null;
              return (
                <MatchCard
                  key={m.id}
                  match={m}
                  entity={entity}
                  treePerson={treeById.get(m.treePersonId) ?? null}
                  relatives={describeRelatives(tree, m.treePersonId)}
                  citations={(entity?.turnIds ?? [])
                    .filter((id) => turns.get(id)?.role === "grandparent")
                    .slice(0, 2)
                    .flatMap((id) => {
                      const t = turns.get(id);
                      return t ? [{ turnId: id, quote: t.text.length > 160 ? `${t.text.slice(0, 158)}…` : t.text }] : [];
                    })}
                  alsoNames={alsoNames}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
