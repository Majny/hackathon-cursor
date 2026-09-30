import type { Metadata } from "next";
import { getDb } from "@/lib/store";
import { getConversations, getOverview, routes } from "@/lib/archive";
import { ConversationCard } from "@/components/archive/conversations/ConversationCard";
import { Crumbs, Label, WhatsAppGlyph } from "@/components/archive/conversations/parts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conversations · Heirloom" };

export default async function ConversationsPage() {
  const db = await getDb();
  const calls = getConversations(db);
  const { nextCall, stats } = getOverview(db);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Crumbs items={[{ label: "Overview", href: routes.overview() }, { label: "Conversations" }]} />

      <header className="mt-6 grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Label num="01">Every call</Label>
          <h1 className="font-(family-name:--font-display) text-[2.6rem] leading-[1.02] tracking-[-0.015em] text-ink sm:text-[3.4rem]">
            Conversations with <em className="italic text-brick">Tom</em>
          </h1>
          <p className="mt-4 max-w-[60ch] text-[1.1rem] leading-[1.65] text-ink-soft">
            Tom rings Grandpa on WhatsApp. Nobody presses anything. After each call,
            the full transcript lands here. Every line in the book links back to one of these lines.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem] text-ink">
            <span><strong className="font-(family-name:--font-display) text-[1.3rem]">{stats.conversations}</strong> calls</span>
            <span><strong className="font-(family-name:--font-display) text-[1.3rem]">{stats.minutesRecorded}</strong> minutes recorded</span>
            <span><strong className="font-(family-name:--font-display) text-[1.3rem]">{stats.grandparentLines}</strong> things Grandpa said</span>
          </p>
        </div>

        {nextCall && (
          <aside className="rounded-2xl border border-moss/30 bg-moss/5 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-moss">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-moss" />
              </span>
              Next call
            </div>
            <p className="mt-2 font-(family-name:--font-display) text-[1.35rem] leading-snug text-ink">
              Tom will ask about {nextCall.topic}
            </p>
            {nextCall.opener && (
              <p className="mt-3 rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-[0.95rem] italic leading-snug text-ink-soft shadow-[0_1px_0_rgba(59,42,30,0.05)]">
                “{nextCall.opener}”
              </p>
            )}
            <p className="mt-3 inline-flex items-center gap-1.5 text-[0.8rem] text-ink-soft">
              <WhatsAppGlyph className="h-3.5 w-3.5 text-[#1f8a4c]" /> Placed automatically over WhatsApp
            </p>
          </aside>
        )}
      </header>

      <section aria-label="Calls" className="mt-12 space-y-6">
        {calls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-[1.05rem] text-ink-soft">
            Tom hasn&apos;t called yet. The first conversation will appear here as soon as the call ends.
          </div>
        ) : (
          <ol className="relative space-y-6 border-l-2 border-dashed border-line pl-5 sm:pl-8">
            {calls.map((c, i) => (
              <li key={c.id} className="relative">
                <span aria-hidden className="absolute top-8 -left-[1.72rem] h-3 w-3 rounded-full border-2 border-paper bg-brick sm:-left-[2.47rem]" />
                <ConversationCard c={c} latest={i === 0} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
