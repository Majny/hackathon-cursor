import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { topicLabel } from "@/lib/topics";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatTime, nickname } from "@/components/book/citations";

export const dynamic = "force-dynamic";

export default async function TranscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const session = db.sessions.find((s) => s.id === id);
  if (!session) notFound();

  const turns = db.turns.filter((t) => t.sessionId === id).sort((a, b) => a.idx - b.idx);
  const summary = db.summaries.find((s) => s.sessionId === id) ?? null;
  const continued = session.continuedThreadId ? db.threads.find((t) => t.id === session.continuedThreadId) : null;
  const opened = db.threads.filter((t) => t.createdInSession === id);
  const resolved = db.threads.filter((t) => t.resolvedInSession === id);
  const gpName = `Grandpa ${nickname(db.grandparent?.fullName, "Jarda")}`;
  const aiName = nickname(db.grandparent?.grandchildName, "Tom");
  const sessions = [...db.sessions].sort((a, b) => a.index - b.index);

  return (
    <main className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/family" className="text-ink-soft hover:text-brick">← Overview</Link>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight">Conversation {session.index}</h1>
          <p className="text-lg text-ink-soft">
            {formatDate(session.startedAt)} · {turns.length} lines · {session.mode === "voice" ? "by voice" : "typed"}
          </p>
        </div>
        {sessions.length > 1 && (
          <div className="flex gap-2">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/family/sessions/${s.id}`}
                className={`rounded-full px-4 py-1.5 ${s.id === id ? "bg-ink text-paper" : "border border-line bg-card hover:bg-paper-dark"}`}
              >
                {s.index}
              </Link>
            ))}
          </div>
        )}
      </div>

      {(summary || continued || opened.length > 0 || resolved.length > 0) && (
        <section className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-line bg-card p-6 shadow-sm md:col-span-3">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-ink-soft">Summary</h2>
            {continued && (
              <p className="mb-3"><Badge tone="brick">↪ picks up: {continued.title}</Badge></p>
            )}
            {summary ? (
              <>
                <p className="font-serif text-xl leading-relaxed">{summary.summary}</p>
                {summary.topicsCovered.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {summary.topicsCovered.map((k) => <Badge key={k}>{topicLabel(k)}</Badge>)}
                  </div>
                )}
                {summary.keyFacts.length > 0 && (
                  <ul className="mt-4 list-disc space-y-1 pl-6 text-ink-soft">
                    {summary.keyFacts.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                )}
              </>
            ) : (
              <p className="italic text-ink-soft">No summary yet.</p>
            )}
          </div>
          <div className="space-y-4 md:col-span-2">
            {opened.length > 0 && (
              <div className="rounded-2xl border border-dashed border-brick/40 bg-brick/5 p-5">
                <h2 className="mb-2 text-sm uppercase tracking-wide text-brick-dark">Unfinished stories</h2>
                <ul className="space-y-3">
                  {opened.map((t) => (
                    <li key={t.id}>
                      <p className="font-semibold">
                        {t.title} {t.resolvedInSession && <Badge tone="moss">finished in {t.resolvedInSession}</Badge>}
                      </p>
                      <p className="text-sm text-ink-soft">{t.whyUnfinished}</p>
                      {t.turnIds.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-2 text-sm">
                          {t.turnIds.map((tid) => (
                            <a key={tid} href={`#${tid}`} className="text-brick underline">{tid}</a>
                          ))}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {resolved.length > 0 && (
              <div className="rounded-2xl border border-moss/30 bg-moss/5 p-5">
                <h2 className="mb-2 text-sm uppercase tracking-wide text-moss">Finished in this conversation</h2>
                <ul className="space-y-1">
                  {resolved.map((t) => <li key={t.id} className="font-semibold">✓ {t.title}</li>)}
                </ul>
              </div>
            )}
            {summary?.nextTopic && (
              <div className="rounded-2xl border border-line bg-card p-5">
                <h2 className="mb-1 text-sm uppercase tracking-wide text-ink-soft">Next time</h2>
                <p>{summary.nextTopic}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section aria-label="Transcript" className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold">Transcript</h2>
        {turns.length === 0 && <p className="italic text-ink-soft">The transcript is empty.</p>}
        {turns.map((t) => {
          const gp = t.role === "grandparent";
          return (
            <div
              key={t.id}
              id={t.id}
              className={`group flex scroll-mt-28 rounded-2xl p-2 transition-colors target:bg-warn-soft target:ring-2 target:ring-warn ${
                gp ? "justify-start" : "justify-end"
              }`}
            >
              <div className={`max-w-[78%] ${gp ? "" : "text-right"}`}>
                <div className={`mb-1 flex items-center gap-2 text-sm text-ink-soft ${gp ? "" : "justify-end"}`}>
                  <span className="font-semibold text-ink">{gp ? gpName : `${aiName} (AI)`}</span>
                  <a href={`#${t.id}`} className="font-mono text-xs opacity-60 hover:text-brick hover:opacity-100">
                    #{t.id}
                  </a>
                  <span className="text-xs">{formatTime(t.at)}</span>
                </div>
                <div
                  className={`inline-block rounded-2xl px-5 py-3 text-left text-lg leading-relaxed shadow-sm ${
                    gp
                      ? "rounded-tl-sm border border-line bg-card font-serif text-xl text-ink"
                      : "rounded-tr-sm bg-brick/10 text-ink"
                  }`}
                >
                  {t.text}
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
