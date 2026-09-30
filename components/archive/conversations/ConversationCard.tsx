import Link from "next/link";
import type { ConversationCardVM } from "@/lib/archive";
import { Pill, WhatsAppGlyph, focusRing } from "./parts";

export function ConversationCard({ c, latest = false }: { c: ConversationCardVM; latest?: boolean }) {
  return (
    <article className="group relative rounded-2xl border border-line bg-card p-5 shadow-[0_1px_0_rgba(59,42,30,0.04)] transition-colors hover:border-brick/30 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div>
            <h2 className="font-(family-name:--font-display) text-[1.7rem] leading-tight text-ink">
              <Link href={c.href} className={`rounded after:absolute after:inset-0 after:rounded-2xl hover:text-brick ${focusRing}`}>
                {c.title}
              </Link>
              {latest && (
                <span className="ml-3 align-middle rounded-full bg-moss/15 px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-moss">
                  Latest
                </span>
              )}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9rem] text-ink-soft">
              <span>{c.date}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1 text-[#1f8a4c]">
                <WhatsAppGlyph className="h-3.5 w-3.5" />
                {c.channel}
              </span>
              {c.durationMin != null && (
                <>
                  <span aria-hidden>·</span>
                  <span>{c.durationMin} min</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{c.lineCount} lines, {c.grandparentLines} from Grandpa</span>
            </p>
          </div>
        </div>
        {c.topics.length > 0 && (
          <div className="relative z-10 flex flex-wrap gap-2">
            {c.topics.map((t) => (
              <Pill key={t.key}>{t.label}</Pill>
            ))}
          </div>
        )}
      </div>

      {c.continuedThread && (
        <p className="relative z-10 mt-5">
          <Pill tone="brick" title="This call picked up an unfinished story">
            Continues: {c.continuedThread.title}
          </Pill>
        </p>
      )}

      {c.summary && (
        <p className="mt-4 max-w-[65ch] text-[1.05rem] leading-[1.65] text-ink">{c.summary}</p>
      )}

      {c.highlight && (
        <blockquote className="mt-5 border-l-2 border-brick/50 pl-4">
          <p className="font-(family-name:--font-display) text-[1.2rem] italic leading-snug text-ink">
            “{c.highlight.quote}”
          </p>
          <footer className="mt-1 text-[0.8rem] text-ink-soft">
            {c.highlight.speaker} · {c.highlight.source}
          </footer>
        </blockquote>
      )}

      <div className="relative z-10 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4">
        <div className="flex flex-wrap items-center gap-2 text-[0.85rem] text-ink-soft">
          {c.people.length > 0 && <span className="mr-1">People:</span>}
          {c.people.map((p) => (
            <Pill key={p.id} href={p.href}>{p.name}</Pill>
          ))}
          {c.resolvedThreads.map((t) => (
            <Pill key={t.id} tone="moss">Finished: {t.title}</Pill>
          ))}
          {c.openedThreads.map((t) => (
            <Pill key={t.id} tone="warn">Open: {t.title}</Pill>
          ))}
        </div>
        <span className="text-[0.9rem] font-semibold text-brick">
          Transcript
        </span>
      </div>
    </article>
  );
}
