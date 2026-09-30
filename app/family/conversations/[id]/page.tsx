import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { entityLinkTerms, getConversation, getConversations, routes } from "@/lib/archive";
import { TranscriptTurn } from "@/components/archive/conversations/TranscriptTurn";
import { focusRing } from "@/components/archive/conversations/parts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const c = getConversation(db, id);
  return { title: c ? `Call on ${c.date} · Heirloom` : "Call · Heirloom" };
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
  const openStories = db.threads.filter((t) => t.createdInSession === c.id && !t.resolvedInSession);
  const hasLearned = c.keyFacts.length > 0 || c.resolvedThreads.length > 0 || openStories.length > 0 || !!c.nextTopic;
  const linkCls = `rounded text-[1.05rem] text-brick underline-offset-4 hover:underline ${focusRing}`;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-[18px] sm:px-8 sm:py-14">
      <Link href={routes.conversations()} className={linkCls}>← All calls</Link>

      <h1 className="mt-5 font-(family-name:--font-display) text-[2.2rem] leading-tight text-ink sm:text-[2.8rem]">
        Call on {c.date}
      </h1>
      <p className="mt-2 text-[1.15rem] text-ink-soft">
        What Tom and Grandpa talked about{c.durationMin != null ? ` for ${c.durationMin} minutes` : ""}, word for word.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <section aria-label="Summary" className="rounded-2xl border border-line bg-card p-6 sm:p-7">
            <h2 className="text-[1rem] font-semibold text-ink-soft">In short</h2>
            <p className="mt-2 max-w-[62ch] font-(family-name:--font-display) text-[1.3rem] leading-[1.6] text-ink">
              {c.summary || "The summary is still being written. You can read the whole call below."}
            </p>
          </section>

          <section aria-label="The whole call" className="mt-10">
            <h2 className="mb-4 font-(family-name:--font-display) text-[1.8rem] text-ink">The whole call</h2>
            {c.turns.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-line bg-card p-6 text-ink-soft">
                The words of this call are still on their way.
              </p>
            ) : (
              <div>
                {c.turns.map((t) => (
                  <TranscriptTurn key={t.turnId} t={t} links={links} />
                ))}
              </div>
            )}
          </section>
        </div>

        {hasLearned && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <details className="group rounded-2xl border border-line bg-card p-5 lg:open:bg-card" open>
              <summary className={`cursor-pointer list-none text-[1.15rem] font-semibold text-ink ${focusRing}`}>
                What we learned <span aria-hidden className="text-ink-soft group-open:hidden">+</span>
              </summary>
              {c.keyFacts.length > 0 && (
                <ul className="mt-3 space-y-2 text-[1.02rem] leading-snug text-ink">
                  {c.keyFacts.map((f, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brick" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              {c.resolvedThreads.length > 0 && (
                <p className="mt-4 text-[1rem] text-ink-soft">
                  Finished the story: <span className="text-ink">{c.resolvedThreads.map((t) => t.title).join(", ")}</span>
                </p>
              )}
              {openStories.length > 0 && (
                <p className="mt-3 text-[1rem] text-ink-soft">
                  Still to finish: <span className="text-ink">{openStories.map((t) => t.title).join(", ")}</span>
                </p>
              )}
              {c.nextTopic && (
                <p className="mt-3 text-[1rem] text-ink-soft">
                  Next time Tom will ask about <span className="text-ink">{c.nextTopic}</span>.
                </p>
              )}
            </details>
          </aside>
        )}
      </div>

      <nav aria-label="Previous and next call" className="mt-12 flex flex-wrap justify-between gap-3 border-t border-line pt-6">
        {prev ? <Link href={prev.href} className={linkCls}>← Earlier call ({prev.date})</Link> : <span />}
        {next ? (
          <Link href={next.href} className={linkCls}>Later call ({next.date}) →</Link>
        ) : (
          <Link href={routes.conversations()} className={linkCls}>All calls</Link>
        )}
      </nav>
    </main>
  );
}
