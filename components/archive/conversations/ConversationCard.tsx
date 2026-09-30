import Link from "next/link";
import type { ConversationCardVM } from "@/lib/archive";
import { focusRing } from "./parts";

/** One plain row in the list of calls: date, length, one sentence, "Read the call". */
export function ConversationCard({ c, latest = false }: { c: ConversationCardVM; latest?: boolean }) {
  const oneLine = c.summary ? c.summary.split(/(?<=[.!?])\s/)[0] : null;
  return (
    <article className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="text-[1.05rem] text-ink-soft">
          <span className="font-semibold text-ink">{c.date}</span>
          {c.durationMin != null && <> · {c.durationMin} min</>}
          {latest && (
            <span className="ml-3 rounded-full bg-moss/15 px-2.5 py-0.5 text-[0.85rem] font-semibold text-moss">Newest</span>
          )}
        </p>
        <p className="mt-1.5 max-w-[60ch] text-[1.2rem] leading-[1.55] text-ink">
          {oneLine ?? c.title}
        </p>
      </div>
      <Link
        href={c.href}
        className={`inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl border border-brick/40 px-5 text-[1.05rem] font-semibold text-brick transition hover:bg-brick hover:text-paper ${focusRing}`}
      >
        Read the call
      </Link>
    </article>
  );
}
