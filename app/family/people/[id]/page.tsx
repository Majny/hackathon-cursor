import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/lib/store";
import { getPersonProfile, getPeople, routes } from "@/lib/archive";
import { resolveTree } from "@/lib/treeLayout";
import { describeRelatives } from "@/components/people/relatives";
import { Avatar, Chip, ChapterRefLink, Crumbs, EmptyNote, QuoteCard, SectionHeading, TreeBadge, display, focusRing, cardCls } from "@/components/archive/people/kit";
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

  const calls = p.callsMentioned;
  const meta = [
    capitalize(p.relation),
    p.years ? `born ${p.years}` : null,
    p.place,
    `mentioned ${p.mentionCount} times in ${calls.length} ${calls.length === 1 ? "call" : "calls"}`,
  ].filter(Boolean) as string[];

  return (
    <main>
      <Crumbs crumbs={[{ label: "Overview", href: routes.overview() }, { label: "People", href: routes.people() }, { label: p.name }]} />

      <header className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-center">
        <Avatar initials={p.initials} size={72} tone={p.treeStatus === "none" ? "neutral" : p.group === "family" ? "brick" : "moss"} />
        <div className="min-w-0">
                    <h1 className={`${display} text-[2.2rem] leading-tight sm:text-[2.6rem]`}>{p.name}</h1>
          <p className="mt-2 text-[1.05rem] text-ink-soft">{meta.join(" · ")}</p>
          <div className="mt-3">
            <TreeBadge status={p.treeStatus} />
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
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
              <span id="words-h">
                What Grandpa said
              </span>
            </SectionHeading>
            {grandpaQuotes.length === 0 ? (
              <EmptyNote>Grandpa hasn’t said much about {p.name} yet. Tom will ask on the next call.</EmptyNote>
            ) : (
              <div className="space-y-5">
                {grandpaQuotes.map((q, i) => (
                  <QuoteCard key={q.turnId} q={q} size={i === 0 ? "lg" : "sm"} />
                ))}
              </div>
            )}
            {tomQuotes.length > 0 && (
              <details className="mt-4">
                <summary className={`min-h-11 cursor-pointer py-2.5 text-ink-soft ${focusRing}`}>
                  What Tom asked about {p.name} ({tomQuotes.length})
                </summary>
                <div className="space-y-4 pb-3 pt-2">
                  {tomQuotes.map((q) => (
                    <QuoteCard key={q.turnId} q={q} />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section aria-labelledby="appears-h">
            <SectionHeading>
              <span id="appears-h">Appears in</span>
            </SectionHeading>
            {p.chapterRefs.length === 0 && p.events.length === 0 ? (
              <EmptyNote>Not in a written story yet. Once Tom hears more, {p.name} will appear in the family book.</EmptyNote>
            ) : (
              <div className="space-y-6">
                {p.chapterRefs.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-ink">Stories</h3>
                    <ul className="space-y-1">
                      {p.chapterRefs.map((r) => (
                        <li key={`${r.chapterId}-${r.paragraphId}`}>
                          <ChapterRefLink r={r} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.events.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-base font-semibold text-ink">On the life timeline</h3>
                    <ul className="space-y-1">
                      {p.events.map((e) => (
                        <li key={e.id}>
                          <Link
                            href={e.href}
                            className={`flex min-h-11 items-baseline gap-4 py-1 hover:text-brick ${focusRing}`}
                          >
                            <span className={`w-14 shrink-0 tabular-nums text-ink-soft`}>{e.year}</span>
                            <span>{e.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {p.notes && (
            <div className={cardCls}>
              <h2 className="mb-2 text-base font-semibold text-ink">What we know</h2>
              <p className="leading-relaxed">{p.notes}</p>
            </div>
          )}

          {p.firstMentioned && (
            <div className={cardCls}>
              <h2 className="mb-2 text-base font-semibold text-ink">First mentioned</h2>
              <p className="text-ink-soft">
                {p.firstMentioned.source}
                {p.firstMentioned.sessionDate ? ` · ${p.firstMentioned.sessionDate}` : ""}
              </p>
              <Link href={p.firstMentioned.href} className={`mt-1 inline-flex min-h-11 items-center font-medium text-brick underline-offset-4 hover:underline ${focusRing}`}>
                Open in call
              </Link>
            </div>
          )}

          <div className={cardCls}>
            <h2 className="mb-3 text-base font-semibold text-ink">Places</h2>
            {p.places.length === 0 ? (
              <p className="text-ink-soft">No places linked yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {p.places.map((pl) => (
                  <Chip key={pl.id} href={pl.href}>
                    {pl.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          {alsoPeople.length > 0 && (
            <div className={cardCls}>
              <h2 className="mb-3 text-base font-semibold text-ink">In the same stories</h2>
              <ul className="space-y-1">
                {alsoPeople.map((x) => (
                  <li key={x.id}>
                    <Link href={x.href} className={`flex min-h-11 items-center gap-3 rounded-lg px-1 hover:text-brick ${focusRing}`}>
                      <Avatar initials={x.initials} size={36} tone={x.treeStatus === "none" ? "neutral" : "brick"} />
                      <span>
                        <span className="font-medium">{x.name}</span>
                        <span className="block text-sm text-ink-soft">{x.relation}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
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
