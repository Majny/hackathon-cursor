import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { entityLinkTerms, getConversation, getConversations, routes } from "@/lib/archive";
import { TranscriptTurn } from "@/components/archive/conversations/TranscriptTurn";
import { Crumbs, Label, Pill, WhatsAppGlyph, focusRing } from "@/components/archive/conversations/parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const c = getConversation(db, id);
  return { title: c ? `${c.title} · ${c.date} · Heirloom` : "Conversation · Heirloom" };
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const c = getConversation(db, id);
  if (!c) notFound();

  const links = entityLinkTerms(db);
  const all = getConversations(db).sort((a, b) => a.index - b.index);
  const pos = all.findIndex((x) => x.id === c.id);
  const prev = pos > 0 ? all[pos - 1] : null;
  const next = pos >= 0 && pos < all.length - 1 ? all[pos + 1] : null;
  const quotedInBook = c.turns.filter((t) => t.chapterRefs.length > 0).length;
  const threadAnchors = db.threads.filter((t) => t.createdInSession === c.id);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Crumbs
        items={[
          { label: "Overview", href: routes.overview() },
          { label: "Conversations", href: routes.conversations() },
          { label: c.title },
        ]}
      />

      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Label>Transcript</Label>
          <h1 className="font-(family-name:--font-display) text-[2.6rem] leading-[1.02] tracking-[-0.015em] text-ink sm:text-[3.4rem]">
            {c.title} <em className="italic text-brick">· {c.date}</em>
          </h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[1rem] text-ink-soft">
            <span className="inline-flex items-center gap-1.5 text-[#1f8a4c]">
              <WhatsAppGlyph /> {c.channel}
            </span>
            {c.durationMin != null && <><span aria-hidden>·</span><span>{c.durationMin} min</span></>}
            <span aria-hidden>·</span>
            <span>{c.lineCount} lines</span>
            {quotedInBook > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="text-brick-dark">{quotedInBook} quoted in the book</span>
              </>
            )}
          </p>
        </div>
        {all.length > 1 && (
          <nav aria-label="Other calls" className="flex flex-wrap gap-2">
            {all.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                aria-current={s.id === c.id ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-[0.9rem] font-semibold transition ${focusRing} ${
                  s.id === c.id ? "bg-ink text-paper" : "border border-line bg-card text-ink hover:border-brick/40 hover:text-brick"
                }`}
              >
                {s.title}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Summary */}
      <section className="mt-10 grid gap-5 md:grid-cols-5">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_0_rgba(59,42,30,0.04)] sm:p-7 md:col-span-3">
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">What Grandpa talked about</h2>
          {c.continuedThread && (
            <p className="mt-3">
              <Pill tone="brick"><span aria-hidden>↪</span> Continued from last call: {c.continuedThread.title}</Pill>
            </p>
          )}
          {c.summary ? (
            <p className="mt-3 max-w-[65ch] font-(family-name:--font-display) text-[1.25rem] leading-[1.6] text-ink">
              {c.summary}
            </p>
          ) : (
            <p className="mt-3 italic text-ink-soft">The summary is still being written. The full transcript is below.</p>
          )}
          {c.topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2.5">
              {c.topics.map((t) => <Pill key={t.key}>{t.label}</Pill>)}
            </div>
          )}
          {c.keyFacts.length > 0 && (
            <>
              <h3 className="mt-6 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">Facts we learned</h3>
              <ul className="mt-2 space-y-1.5 text-[1rem] leading-snug text-ink">
                {c.keyFacts.map((f, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brick" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="space-y-5 md:col-span-2">
          {c.resolvedThreads.length > 0 && (
            <div className="rounded-2xl border border-moss/30 bg-moss/5 p-5">
              <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-moss">Finished in this call</h2>
              <ul className="mt-2 space-y-1">
                {c.resolvedThreads.map((t) => (
                  <li key={t.id} className="font-semibold text-ink">✓ {t.title}</li>
                ))}
              </ul>
            </div>
          )}
          {threadAnchors.length > 0 && (
            <div className="rounded-2xl border border-dashed border-warn bg-warn-soft/50 p-5">
              <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">Stories left open in this call</h2>
              <ul className="mt-2 space-y-3">
                {threadAnchors.map((t) => (
                  <li key={t.id}>
                    <p className="font-semibold text-ink">
                      {t.resolvedInSession ? "✓ " : "○ "}
                      {t.title}
                    </p>
                    {t.whyUnfinished && <p className="text-[0.9rem] leading-snug text-ink-soft">{t.whyUnfinished}</p>}
                    {t.turnIds.length > 0 && (
                      <p className="mt-1.5 flex flex-wrap gap-2">
                        {t.turnIds
                          .filter((tid) => c.turns.some((x) => x.turnId === tid))
                          .map((tid) => (
                            <a key={tid} href={`#${tid}`} className={`rounded text-[0.85rem] text-brick underline underline-offset-4 ${focusRing}`}>
                              Jump to the moment
                            </a>
                          ))
                          .slice(0, 1)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(c.nextTopic || c.nextSessionOpener) && (
            <div className="rounded-2xl border border-line bg-card p-5">
              <h2 className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-moss">
                <span className="h-2 w-2 rounded-full bg-moss" /> Next time
              </h2>
              {c.nextTopic && <p className="mt-2 text-[1.02rem] text-ink">Tom will ask about {c.nextTopic}</p>}
              {c.nextSessionOpener && (
                <p className="mt-3 rounded-2xl rounded-tl-sm bg-paper-dark px-4 py-3 text-[0.95rem] italic leading-snug text-ink-soft">
                  “{c.nextSessionOpener}”
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Transcript */}
      <section aria-label="Transcript" className="mx-auto mt-14 max-w-4xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-(family-name:--font-display) text-[2rem] text-ink">The whole call</h2>
          <p className="text-[0.85rem] text-ink-soft">
            Names and places link to their pages. <span className="text-brick-dark">Outlined lines</span> are quoted in the book.
          </p>
        </div>
        {c.turns.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-card p-6 italic text-ink-soft">
            The transcript for this call is still on its way.
          </p>
        ) : (
          <div className="space-y-2">
            {c.turns.map((t) => (
              <TranscriptTurn key={t.turnId} t={t} links={links} />
            ))}
          </div>
        )}
      </section>

      <nav aria-label="Previous and next call" className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-between gap-3 border-t border-line pt-6">
        {prev ? (
          <Link href={prev.href} className={`rounded-xl px-2 py-2 text-brick hover:text-brick-dark ${focusRing}`}>
            ← {prev.title} · {prev.date}
          </Link>
        ) : <span />}
        {next ? (
          <Link href={next.href} className={`rounded-xl px-2 py-2 text-brick hover:text-brick-dark ${focusRing}`}>
            {next.title} · {next.date} →
          </Link>
        ) : (
          <Link href={routes.conversations()} className={`rounded-xl px-2 py-2 text-brick hover:text-brick-dark ${focusRing}`}>
            All conversations →
          </Link>
        )}
      </nav>
    </main>
  );
}
