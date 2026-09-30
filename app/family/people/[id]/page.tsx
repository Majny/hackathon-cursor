import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/lib/store";
import { getPersonProfile, getPeople, routes } from "@/lib/archive";
import { resolveTree } from "@/lib/treeLayout";
import { describeRelatives } from "@/components/people/relatives";
import { Avatar, Chip, Crumbs, EmptyNote, QuoteCard, SectionHeading, display, focusRing } from "@/components/archive/people/kit";
import { TreeLinkCard } from "@/components/archive/people/TreeLinkCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const p = getPersonProfile(db, decodeURIComponent(id));
  return { title: p ? `${p.name} · Heirloom` : "Heirloom" };
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const p = getPersonProfile(db, decodeURIComponent(id));
  if (!p) notFound();

  const tree = resolveTree(db.tree);
  const relatives = p.treePerson ? describeRelatives(tree, p.treePerson.id) : "";
  const grandpaQuotes = p.quotes.filter((q) => q.role === "grandparent");
  const tomQuotes = p.quotes.filter((q) => q.role !== "grandparent");

  // Local helper: people who share an event with this person ("often mentioned together").
  const eventIds = new Set(p.events.map((e) => e.id));
  const together = new Map<string, number>();
  for (const e of db.events) {
    if (!eventIds.has(e.id)) continue;
    for (const pid of e.personIds) if (pid !== p.id) together.set(pid, (together.get(pid) ?? 0) + 1);
  }
  const alsoPeople = getPeople(db).filter((x) => together.has(x.id));

  const all = getPeople(db);
  const idx = all.findIndex((x) => x.id === p.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const sex = db.persons.find((x) => x.id === p.id)?.sex ?? p.treePerson?.sex ?? null;
  const him = sex === "F" ? "her" : sex === "M" ? "him" : "them";
  const gpName = db.grandparent?.displayName || "Grandpa";
  const calls = p.callsMentioned.length;
  const sub = [capitalize(p.relation), p.years ? `born ${p.years}` : null, p.place].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto max-w-[46rem] text-lg">
      <Crumbs crumbs={[{ label: "People", href: routes.people() }, { label: p.name }]} />

      <header className="flex items-center gap-5 pb-6">
        <Avatar initials={p.initials} size={72} tone={p.group === "family" ? "brick" : "moss"} />
        <div className="min-w-0">
          <h1 className={`${display} text-[2.4rem] leading-tight sm:text-[2.8rem]`}>{p.name}</h1>
          <p className="mt-1 text-[1.15rem] text-ink-soft">{sub}</p>
        </div>
      </header>

      <p className="mb-8 text-[1.15rem] text-ink-soft">
        What {gpName} told us about {p.name}
        {calls ? `, from ${calls} ${calls === 1 ? "call" : "calls"}` : ""}.
      </p>

      <div className="space-y-12">
        <TreeLinkCard
          name={p.name}
          status={p.treeStatus}
          match={p.match}
          treePerson={p.treePerson}
          alsoConsidered={p.alsoConsidered}
          inferredReason={p.inferredReason}
          relatives={relatives}
          treeHref={p.treeHref}
        />

        <section aria-labelledby="words-h">
          <SectionHeading>
            <span id="words-h">What {gpName} said about {him}</span>
          </SectionHeading>
          {p.notes && <p className="mb-6 max-w-[60ch] text-[1.2rem] leading-relaxed text-ink">{p.notes}</p>}
          {grandpaQuotes.length === 0 ? (
            <EmptyNote>
              {gpName} hasn’t said much about {p.name} yet. We’ll ask on the next call.
            </EmptyNote>
          ) : (
            <div className="space-y-6">
              {grandpaQuotes.map((q) => (
                <QuoteCard key={q.turnId} q={q} size="lg" />
              ))}
            </div>
          )}
        </section>

        {p.chapterRefs.length > 0 && (
          <section aria-labelledby="stories-h">
            <SectionHeading>
              <span id="stories-h">Stories with {p.name}</span>
            </SectionHeading>
            <ul className="space-y-1">
              {p.chapterRefs.map((r) => (
                <li key={`${r.chapterId}-${r.paragraphId}`}>
                  <Link href={r.href} className={`inline-flex min-h-11 items-center text-ink underline-offset-4 hover:text-brick hover:underline ${focusRing}`}>
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(p.events.length > 0 || p.places.length > 0 || alsoPeople.length > 0 || tomQuotes.length > 0 || p.firstMentioned) && (
          <details className="border-t border-line pt-4">
            <summary className={`min-h-11 cursor-pointer py-2 text-ink-soft ${focusRing}`}>More about {p.name}</summary>
            <div className="space-y-8 pt-4">
              {p.events.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-ink">On the life timeline</h3>
                  <ul className="space-y-1">
                    {p.events.map((e) => (
                      <li key={e.id}>
                        <Link href={e.href} className={`flex min-h-11 items-baseline gap-4 py-1 hover:text-brick ${focusRing}`}>
                          <span className="w-14 shrink-0 tabular-nums text-ink-soft">{e.year}</span>
                          <span>{e.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {p.places.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-ink">Places</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {p.places.map((pl) => (
                      <Chip key={pl.id} href={pl.href}>
                        {pl.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {alsoPeople.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-ink">Often mentioned together</h3>
                  <ul className="space-y-1">
                    {alsoPeople.map((x) => (
                      <li key={x.id}>
                        <Link href={x.href} className={`inline-flex min-h-11 items-center hover:text-brick ${focusRing}`}>
                          {x.name} <span className="ml-2 text-ink-soft">({x.relation})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {tomQuotes.length > 0 && (
                <div>
                  <h3 className="mb-2 font-semibold text-ink">What was asked about {p.name}</h3>
                  <div className="space-y-4">
                    {tomQuotes.map((q) => (
                      <QuoteCard key={q.turnId} q={q} />
                    ))}
                  </div>
                </div>
              )}
              {p.firstMentioned && (
                <p className="text-ink-soft">
                  First mentioned in {p.firstMentioned.source}
                  {p.firstMentioned.sessionDate ? `, ${p.firstMentioned.sessionDate}` : ""}.{" "}
                  <Link href={p.firstMentioned.href} className="text-brick underline underline-offset-4">
                    Hear it in the call
                  </Link>
                </p>
              )}
            </div>
          </details>
        )}
      </div>

      <nav aria-label="More people" className="mt-16 flex flex-wrap justify-between gap-4 border-t border-line pt-6">
        {prev ? (
          <Link href={prev.href} className={`inline-flex min-h-11 items-center text-brick underline-offset-4 hover:underline ${focusRing}`}>
            ← {prev.name}
          </Link>
        ) : (
          <span />
        )}
        <Link href={routes.people()} className={`inline-flex min-h-11 items-center text-ink-soft underline-offset-4 hover:underline ${focusRing}`}>
          All people
        </Link>
        {next ? (
          <Link href={next.href} className={`inline-flex min-h-11 items-center text-brick underline-offset-4 hover:underline ${focusRing}`}>
            {next.name} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
