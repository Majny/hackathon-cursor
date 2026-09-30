import Link from "next/link";
import type { ConversationDetail, EntityLink } from "@/lib/archive";
import { ConvLinkedText, Pill, focusRing } from "./parts";

type Turn = ConversationDetail["turns"][number];

export function TranscriptTurn({ t, links }: { t: Turn; links: EntityLink[] }) {
  const gp = t.role === "grandparent";
  const inBook = t.chapterRefs.length > 0;
  const when = t.minuteIn != null ? (t.minuteIn === 0 ? "start of call" : `${t.minuteIn} min in`) : null;

  return (
    <div
      id={t.turnId}
      className={`flex scroll-mt-28 rounded-2xl p-2 sm:p-3 ${gp ? "justify-start" : "justify-end"}`}
    >
      <div className={`flex w-full max-w-[min(100%,46rem)] flex-col ${gp ? "items-start" : "items-end"} sm:max-w-[82%]`}>
        <div className={`mb-1.5 flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-soft ${gp ? "" : "justify-end"}`}>
          <span className={`font-semibold ${gp ? "text-brick-dark" : "text-moss"}`}>
            {gp ? t.speaker : "Tom (AI grandson)"}
          </span>
          {when && <span>· {when}</span>}
          <a
            href={`#${t.turnId}`}
            className={`rounded font-mono text-[0.7rem] opacity-50 hover:text-brick hover:opacity-100 ${focusRing}`}
            aria-label={`Link to this line (${t.turnId})`}
          >
            #{t.turnId}
          </a>
        </div>

        <div
          className={`relative rounded-2xl px-5 py-3.5 shadow-[0_1px_0_rgba(59,42,30,0.05)] ${
            gp
              ? `rounded-tl-sm border bg-card font-(family-name:--font-display) text-[1.22rem] leading-[1.6] text-ink ${
                  inBook ? "border-brick/40 ring-1 ring-brick/15" : "border-line"
                }`
              : "rounded-tr-sm bg-paper-dark text-[1.02rem] leading-[1.6] text-ink"
          }`}
        >
          {inBook && (
            <span className="absolute -top-2.5 right-4 rounded-full bg-brick px-2 py-0.5 font-(family-name:--font-body) text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-paper">
              Quoted in the book
            </span>
          )}
          {gp ? <ConvLinkedText text={t.text} links={links} /> : t.text}
        </div>

        {gp && (t.people.length > 0 || t.places.length > 0 || inBook) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {t.people.map((p) => (
              <Pill key={p.id} href={p.href}>
                <span aria-hidden className="text-brick">●</span> {p.name}
              </Pill>
            ))}
            {t.places.map((p) => (
              <Pill key={p.id} href={p.href}>
                <span aria-hidden className="text-moss">◆</span> {p.name}
              </Pill>
            ))}
            {t.chapterRefs.map((c, i) => (
              <Link
                key={`${c.chapterId}-${c.n}-${i}`}
                href={c.href}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brick/30 bg-brick/10 px-3 py-1 text-[0.85rem] font-medium text-brick-dark transition hover:bg-brick/15 ${focusRing}`}
              >
                Used in: {c.title}
                <span className="rounded bg-brick px-1.5 text-[0.7rem] font-bold text-paper">[{c.n}]</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
