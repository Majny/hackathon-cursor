import Link from "next/link";
import { getDb } from "@/lib/store";
import { LIFE_TOPICS } from "@/lib/topics";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GenerateChapterButton } from "@/components/book/GenerateChapterButton";
import { bookTitle, chapterStats, formatDate, nickname } from "@/components/book/citations";

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
        <p className="text-sm uppercase tracking-[0.25em] text-brick">Family overview</p>
        <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          {bookTitle(gp)}
        </h1>
        <p className="mt-1 text-lg text-ink-soft">
          {gp?.fullName} · born {gp?.birthYear} in {gp?.birthPlace} · talking with his grandson {nickname(gp?.grandchildName, "Tom")}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Sessions */}
        <Card className="lg:col-span-3">
          <CardTitle>Conversations</CardTitle>
          {sessions.length === 0 && (
            <p className="text-ink-soft">
              No conversations yet. <Link href="/talk" className="text-brick underline">Start the first one</Link>
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
                    href={`/family/sessions/${s.id}`}
                    className="block rounded-xl border border-line bg-paper/60 p-4 transition hover:border-brick/50 hover:bg-paper"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif text-xl font-semibold">Conversation {s.index}</span>
                      <span className="text-ink-soft">{formatDate(s.startedAt)}</span>
                      <Badge>{turns} {turns === 1 ? "line" : "lines"}</Badge>
                      {s.mode === "text" && <Badge>typed</Badge>}
                      {s.status !== "done" && <Badge tone="warn">{s.status === "live" ? "in progress" : s.status === "finalizing" ? "writing it down" : "error"}</Badge>}
                      {thread && <Badge tone="brick">↪ picks up: {thread.title}</Badge>}
                      {!thread && s.continuedThreadId && <Badge tone="brick">↪ picks up from last time</Badge>}
                    </div>
                    {summary ? (
                      <p className="mt-2 line-clamp-3 text-ink">{summary.summary}</p>
                    ) : (
                      <p className="mt-2 text-ink-soft italic">No summary yet.</p>
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
            <CardTitle>People in the stories</CardTitle>
            <p className="text-3xl font-semibold">{db.persons.length}</p>
            <p className="text-ink-soft">{db.persons.length === 1 ? "person" : "people"} · {db.places.length} places · {db.events.length} events</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggested > 0 && <Badge tone="warn">{suggested === 1 ? "1 suggested match" : `${suggested} suggested matches`}</Badge>}
              {confirmed > 0 && <Badge tone="moss">{confirmed} confirmed in the tree</Badge>}
            </div>
            <Link href="/family/people" className="mt-4 inline-block text-lg text-brick underline">See everyone →</Link>
          </Card>

          {/* Tree */}
          <Card>
            <CardTitle>Family tree</CardTitle>
            <p className="text-ink-soft">{db.tree?.name ?? "Family tree"} · {db.tree?.persons.length ?? 0} people</p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Link href="/family/tree" className="text-lg text-brick underline">Open the tree →</Link>
              <a
                href="/api/export/gedcom"
                className="rounded-lg border border-line bg-card px-4 py-2 text-base font-medium hover:bg-paper-dark"
              >
                ⬇ Download GEDCOM
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* Chapters */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <CardTitle>Book chapters</CardTitle>
          <Link href="/family/book" className="text-lg text-brick underline">Read the book →</Link>
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
                    <Link href={`/family/book#${ch.id}`} className="font-serif text-xl font-semibold hover:text-brick">
                      {ch.title}
                    </Link>
                  ) : (
                    <p className="font-serif text-xl text-ink-soft italic">Not written yet</p>
                  )}
                  {ch && st && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ch.status === "approved" ? <Badge tone="moss">✓ approved</Badge> : <Badge>draft</Badge>}
                      {st.unverified > 0 && <Badge tone="warn">{st.unverified} unverified</Badge>}
                      {st.edited > 0 && <Badge tone="brick">edited by family</Badge>}
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
