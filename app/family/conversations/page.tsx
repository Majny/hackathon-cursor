import type { Metadata } from "next";
import { getDb } from "@/lib/store";
import { getConversations, getOverview, routes } from "@/lib/archive";
import { ConversationCard } from "@/components/archive/conversations/ConversationCard";
import { Crumbs } from "@/components/archive/conversations/parts";

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
          <h1 className="font-(family-name:--font-display) text-[2.6rem] leading-[1.02] tracking-[-0.015em] text-ink sm:text-[3.4rem]">
            Calls with Tom
          </h1>
          <p className="mt-4 max-w-[60ch] text-[1.1rem] leading-[1.65] text-ink-soft">
            Tom calls Grandpa Jarda on WhatsApp. Each call's full transcript is saved here.
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
          </aside>
        )}
      </header>

      <section aria-label="Calls" className="mt-12 space-y-6">
        {calls.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-8 text-center text-[1.05rem] text-ink-soft">
            No calls yet. Transcripts appear here after each call.
          </div>
        ) : (
          <ol className="space-y-6">
            {calls.map((c, i) => (
              <li key={c.id}>
                <ConversationCard c={c} latest={i === 0} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
