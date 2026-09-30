import Link from "next/link";
import { getDb } from "@/lib/store";
import { LIFE_TOPICS } from "@/lib/topics";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GenerateChapterButton } from "@/components/book/GenerateChapterButton";
import { bookTitle, chapterStats, formatCzDate } from "@/components/book/citations";

export const dynamic = "force-dynamic";

export default async function FamilyOverviewPage() {
  const db = await getDb();
  const gp = db.grandparent;
  const sessions = [...db.sessions].sort((a, b) => a.index - b.index);
  const suggested = db.matches.filter((m) => m.status === "suggested").length;
  const confirmed = db.matches.filter((m) => m.status === "confirmed").length;

  return (
    <main className="space-y-8">
      <section>
        <p className="text-lg text-ink-soft">Rodinný přehled</p>
        <h1 className="font-serif text-4xl font-semibold text-ink">
          {bookTitle(gp)}
        </h1>
        <p className="mt-1 text-lg text-ink-soft">
          {gp?.fullName} · *{gp?.birthYear} {gp?.birthPlace} · povídá si s vnukem {gp?.grandchildName}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Sessions */}
        <Card className="lg:col-span-3">
          <CardTitle>Povídání</CardTitle>
          {sessions.length === 0 && (
            <p className="text-ink-soft">
              Zatím žádné povídání. <Link href="/" className="text-brick underline">Začít povídat</Link>
            </p>
          )}
          <ul className="space-y-4">
            {sessions.map((s) => {
              const summary = db.summaries.find((x) => x.sessionId === s.id);
              const turns = db.turns.filter((t) => t.sessionId === s.id).length;
              const thread = s.continuedThreadId ? db.threads.find((t) => t.id === s.continuedThreadId) : null;
              return (
                <li key={s.id}>
                  <Link
                    href={`/rodina/povidani/${s.id}`}
                    className="block rounded-xl border border-line bg-paper/60 p-4 transition hover:border-brick/50 hover:bg-paper"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-xl font-semibold">Povídání {s.index}</span>
                      <span className="text-ink-soft">{formatCzDate(s.startedAt)}</span>
                      <Badge>{turns} replik</Badge>
                      {s.mode === "text" && <Badge>psané</Badge>}
                      {s.status !== "done" && <Badge tone="warn">{s.status === "live" ? "probíhá" : s.status === "finalizing" ? "zapisuje se" : "chyba"}</Badge>}
                      {thread && <Badge tone="brick">↪ navázáno na: {thread.title}</Badge>}
                      {!thread && s.continuedThreadId && <Badge tone="brick">↪ navázáno na minulé povídání</Badge>}
                    </div>
                    {summary ? (
                      <p className="mt-2 line-clamp-3 text-ink">{summary.summary}</p>
                    ) : (
                      <p className="mt-2 text-ink-soft italic">Shrnutí zatím není.</p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* People */}
          <Card>
            <CardTitle>Lidé z vyprávění</CardTitle>
            <p className="text-3xl font-semibold">{db.persons.length}</p>
            <p className="text-ink-soft">osob · {db.places.length} míst · {db.events.length} událostí</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggested > 0 && <Badge tone="warn">{suggested === 1 ? "1 návrh shody" : `${suggested} návrhy shody`}</Badge>}
              {confirmed > 0 && <Badge tone="moss">{confirmed} potvrzeno ve stromě</Badge>}
            </div>
            <Link href="/rodina/lide" className="mt-4 inline-block text-lg text-brick underline">Zobrazit lidi →</Link>
          </Card>

          {/* Tree */}
          <Card>
            <CardTitle>Rodokmen</CardTitle>
            <p className="text-ink-soft">{db.tree?.name ?? "Rodokmen"} · {db.tree?.persons.length ?? 0} osob</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link href="/rodina/strom" className="text-lg text-brick underline">Otevřít strom →</Link>
              <a
                href="/api/export/gedcom"
                className="rounded-lg border border-line bg-card px-4 py-2 text-base font-medium hover:bg-paper-dark"
              >
                ⬇ Stáhnout GEDCOM
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* Chapters */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>Kapitoly knihy</CardTitle>
          <Link href="/rodina/kniha" className="text-lg text-brick underline">Číst knihu →</Link>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {LIFE_TOPICS.map((t) => {
            const ch = db.chapters.find((c) => c.key === t.key);
            const st = ch ? chapterStats(ch) : null;
            return (
              <li key={t.key} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper/60 p-4">
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-wide text-ink-soft">{t.label}</p>
                  {ch ? (
                    <Link href={`/rodina/kniha#${ch.id}`} className="font-serif text-xl font-semibold hover:text-brick">
                      {ch.title}
                    </Link>
                  ) : (
                    <p className="font-serif text-xl text-ink-soft italic">Zatím nenapsáno</p>
                  )}
                  {ch && st && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ch.status === "approved" ? <Badge tone="moss">✓ schváleno</Badge> : <Badge>koncept</Badge>}
                      {st.unverified > 0 && <Badge tone="warn">{st.unverified}× neověřeno</Badge>}
                      {st.edited > 0 && <Badge tone="brick">upraveno rodinou</Badge>}
                    </div>
                  )}
                </div>
                <GenerateChapterButton topic={t.key} regenerate={!!ch} />
              </li>
            );
          })}
        </ul>
      </Card>
    </main>
  );
}
