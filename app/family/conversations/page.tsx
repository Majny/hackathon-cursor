import type { Metadata } from "next";
import { getDb } from "@/lib/store";
import { getConversations } from "@/lib/archive";
import { ConversationCard } from "@/components/archive/conversations/ConversationCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calls · Heirloom" };

export default async function ConversationsPage() {
  const db = await getDb();
  const calls = getConversations(db);
  const name = db.grandparent?.displayName || "Grandpa";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 text-[18px] sm:px-8 sm:py-14">
      <h1 className="font-(family-name:--font-display) text-[2.4rem] leading-tight text-ink sm:text-[3rem]">
        Calls with Tom
      </h1>
      <p className="mt-3 max-w-[55ch] text-[1.2rem] leading-[1.6] text-ink-soft">
        Every phone call between Tom and {name}, newest first. Open one to read what was said.
      </p>

      {calls.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line bg-card p-8 text-center text-[1.15rem] text-ink-soft">
          No calls yet. They will appear here after the first call.
        </p>
      ) : (
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {calls.map((c, i) => (
            <li key={c.id}>
              <ConversationCard c={c} latest={i === 0} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
