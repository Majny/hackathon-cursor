import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDb } from "@/lib/store";
import { getPeople, getPlaceProfile, getPlaces, routes } from "@/lib/archive";
import { Avatar, ChapterRefLink, Crumbs, EmptyNote, QuoteCard, SectionHeading, cardCls, display, focusRing } from "@/components/archive/people/kit";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const p = getPlaceProfile(db, decodeURIComponent(id));
  return { title: p ? `${p.name} · Heirloom` : "Heirloom" };
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const pl = getPlaceProfile(db, decodeURIComponent(id));
  if (!pl) notFound();

  const peopleCards = new Map(getPeople(db).map((p) => [p.id, p]));
  const grandpaQuotes = pl.quotes.filter((q) => q.role === "grandparent");
  const tomQuotes = pl.quotes.filter((q) => q.role !== "grandparent");
  const years = pl.years.length === 0 ? null : pl.years.length === 1 ? String(pl.years[0]) : `${pl.years[0]}–${pl.years[pl.years.length - 1]}`;

  const all = getPlaces(db);
  const others = all.filter((x) => x.id !== pl.id);

  return (
    <main>
      <Crumbs crumbs={[{ label: "Overview", href: routes.overview() }, { label: "Places", href: routes.places() }, { label: pl.name }]} />

      <header className="pb-8">
        <div className="min-w-0">
                    <h1 className={`${display} text-[2.2rem] leading-tight sm:text-[2.6rem]`}>{pl.name}</h1>
          <p className="mt-2 max-w-[55ch] text-[1.1rem] text-ink-soft">{pl.context}</p>
          <p className="mt-2 text-[0.95rem] text-ink-soft">
            Mentioned {pl.mentionCount} times · {pl.eventCount} {pl.eventCount === 1 ? "event" : "events"}
            {years ? ` · ${years}` : ""}
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="happened-h">
            <SectionHeading>
              <span id="happened-h">
                What happened here
              </span>
            </SectionHeading>
            {pl.events.length === 0 ? (
              <EmptyNote>Grandpa hasn’t told a story set here yet. Tom will ask.</EmptyNote>
            ) : (
              <ol className="space-y-1">
                {pl.events.map((e) => (
                  <li key={e.id}>
                    <Link href={e.href} className={`flex min-h-11 items-baseline gap-4 py-1 hover:text-brick ${focusRing}`}>
                      <span className="w-14 shrink-0 tabular-nums text-ink-soft">{e.year}</span>
                      <span>{e.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="words-h">
            <SectionHeading>
              <span id="words-h">
                What Grandpa said
              </span>
            </SectionHeading>
            {grandpaQuotes.length === 0 ? (
              <EmptyNote>Grandpa hasn’t described {pl.name} in his own words yet.</EmptyNote>
            ) : (
              <div className="space-y-5">
                {grandpaQuotes.map((q, i) => (
                  <QuoteCard key={q.turnId} q={q} size={i === 0 ? "lg" : "sm"} />
                ))}
              </div>
            )}
            {tomQuotes.length > 0 && (
              <details className="mt-4">
                <summary className={`min-h-11 cursor-pointer py-2.5 text-ink-soft ${focusRing}`}>What Tom asked ({tomQuotes.length})</summary>
                <div className="space-y-4 pb-3 pt-2">
                  {tomQuotes.map((q) => (
                    <QuoteCard key={q.turnId} q={q} />
                  ))}
                </div>
              </details>
            )}
          </section>

          {pl.chapterRefs.length > 0 && (
            <section aria-labelledby="stories-h">
              <SectionHeading>
                <span id="stories-h">In the family book</span>
              </SectionHeading>
              <ul className="space-y-1">
                {pl.chapterRefs.map((r) => (
                  <li key={`${r.chapterId}-${r.paragraphId}`}>
                    <ChapterRefLink r={r} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className={cardCls}>
            <h2 className="mb-3 text-base font-semibold text-ink">People here</h2>
            {pl.people.length === 0 ? (
              <p className="text-ink-soft">Nobody linked to this place yet.</p>
            ) : (
              <ul className="space-y-1">
                {pl.people.map((x) => {
                  const c = peopleCards.get(x.id);
                  return (
                    <li key={x.id}>
                      <Link href={x.href} className={`flex min-h-11 items-center gap-3 rounded-lg px-1 hover:text-brick ${focusRing}`}>
                        <Avatar initials={c?.initials ?? x.name.slice(0, 1)} size={36} tone={c && c.treeStatus !== "none" ? "brick" : "neutral"} />
                        <span>
                          <span className="font-medium">{x.name}</span>
                          {c && <span className="block text-sm text-ink-soft">{c.relation}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {others.length > 0 && (
            <div className={cardCls}>
              <h2 className="mb-3 text-base font-semibold text-ink">Other places</h2>
              <ul className="space-y-1">
                {others.map((o) => (
                  <li key={o.id}>
                    <Link href={o.href} className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-1 hover:text-brick ${focusRing}`}>
                      <span>{o.name}</span>
                      <span className="text-sm tabular-nums text-ink-soft">{o.mentionCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
