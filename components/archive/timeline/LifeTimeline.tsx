"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { Timeline, TimelineItem } from "@/lib/archive";

// ───────────────────────── helpers (local, pure) ─────────────────────────

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

type DecadeBlock =
  | { kind: "decade"; decade: number; items: TimelineItem[] }
  | { kind: "gap"; from: number; to: number };

/** Groups dated items by decade; consecutive empty decades collapse into one "quiet" gap. */
export function groupByDecade(items: TimelineItem[], birthYear: number, nowYear: number): DecadeBlock[] {
  const blocks: DecadeBlock[] = [];
  for (let d = decadeOf(birthYear); d <= decadeOf(nowYear); d += 10) {
    const inDecade = items.filter((i) => i.year != null && decadeOf(i.year) === d);
    if (inDecade.length) blocks.push({ kind: "decade", decade: d, items: inDecade });
    else {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "gap") last.to = d;
      else blocks.push({ kind: "gap", from: d, to: d });
    }
  }
  return blocks;
}

function ageRange(decade: number, birthYear: number, nowYear: number): string {
  const a = Math.max(0, decade - birthYear);
  const b = Math.min(decade + 9, nowYear) - birthYear;
  return a === b ? `age ${a}` : `age ${a}–${b}`;
}

function whenLine(i: TimelineItem): string {
  if (i.age == null) return i.yearLabel;
  if (i.kind === "birth") return `${i.yearLabel} · the day it all began`;
  if (i.kind === "call") return `${i.yearLabel} · at ${i.age}, telling it to Tom`;
  return `${i.yearLabel} · when he was ${i.age}`;
}

const SOURCE_LABEL: Record<TimelineItem["kind"], string> = {
  birth: "Beginning",
  event: "From his stories",
  tree: "From the family tree",
  call: "WhatsApp call",
  "not-yet-told": "Not yet told",
};

// ───────────────────────── markers ─────────────────────────

function Marker({ item }: { item: TimelineItem }) {
  const common = "relative z-10 flex h-9 w-9 items-center justify-center rounded-full";
  switch (item.kind) {
    case "birth":
      return (
        <span className={`${common} bg-brick text-paper shadow-[0_0_0_6px_var(--color-paper)]`} aria-hidden>
          ✦
        </span>
      );
    case "tree":
      return (
        <span className={`${common} shadow-[0_0_0_6px_var(--color-paper)]`} aria-hidden>
          <span className="h-4 w-4 rotate-45 border-2 border-brick bg-card" />
        </span>
      );
    case "call":
      return (
        <span className={`${common} bg-moss text-paper shadow-[0_0_0_6px_var(--color-paper)]`} aria-hidden>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
          </svg>
        </span>
      );
    case "not-yet-told":
      return (
        <span className={`${common} border-2 border-dashed border-moss bg-paper text-moss shadow-[0_0_0_6px_var(--color-paper)]`} aria-hidden>
          ?
        </span>
      );
    default:
      return item.approx ? (
        <span className={`${common} border-2 border-dashed border-brick bg-paper shadow-[0_0_0_6px_var(--color-paper)]`} aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-brick/60" />
        </span>
      ) : (
        <span className={`${common} bg-paper shadow-[0_0_0_6px_var(--color-paper)]`} aria-hidden>
          <span className="h-5 w-5 rounded-full border-4 border-brick bg-card" />
        </span>
      );
  }
}

// ───────────────────────── item card ─────────────────────────

const chipCls =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-base transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";

function ItemCard({ item, index }: { item: TimelineItem; index: number }) {
  const reduce = useReducedMotion();
  const q = item.quotes[0];
  const isCall = item.kind === "call";
  const ghost = item.kind === "not-yet-told";
  const tree = item.kind === "tree";

  return (
    <motion.li
      id={item.id}
      className="relative scroll-mt-40 pl-14 sm:pl-16"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: Math.min(index, 3) * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute left-0 top-4 sm:left-1">
        <Marker item={item} />
      </div>

      <div
        className={`rounded-2xl p-5 sm:p-6 ${
          ghost
            ? "border-2 border-dashed border-moss/50 bg-moss/5"
            : tree
              ? "border border-dashed border-brick/40 bg-card"
              : isCall
                ? "border border-moss/30 bg-moss/[0.06]"
                : "border border-line bg-card shadow-[0_1px_0_rgba(59,42,30,0.04)]"
        }`}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className={`text-base font-semibold ${isCall || ghost ? "text-moss" : "text-brick"}`}>
            {whenLine(item)}
            {item.approx && item.kind === "event" && (
              <span className="ml-2 font-normal text-ink-soft">(approximate)</span>
            )}
          </p>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-soft">{SOURCE_LABEL[item.kind]}</p>
        </div>

        <h3 className="mt-1.5 font-(family-name:--font-display) text-2xl font-medium leading-snug text-ink sm:text-[1.7rem]">
          {item.title}
        </h3>
        {item.description && <p className="mt-2 max-w-[65ch] text-[1.05rem] leading-[1.65] text-ink-soft">{item.description}</p>}

        {q && (
          <figure className="mt-4 border-l-4 border-brick/30 pl-4">
            <blockquote className="font-(family-name:--font-display) text-xl italic leading-relaxed text-ink">“{q.quote}”</blockquote>
            <figcaption className="mt-1.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
              <span>
                {q.speaker} · {q.source}
              </span>
              <Link href={q.href} className="inline-flex min-h-11 items-center font-medium text-brick underline underline-offset-4 hover:text-brick-dark">
                Open in conversation →
              </Link>
            </figcaption>
          </figure>
        )}

        {(item.people.length > 0 || item.places.length > 0 || (item.href && (isCall || tree))) && (
          <div className="mt-4 flex flex-wrap gap-2.5">
            {item.people.map((p) => (
              <Link key={p.id} href={p.href} className={`${chipCls} border-line bg-paper text-ink hover:border-brick/50 hover:text-brick-dark`}>
                <span aria-hidden className="text-brick">●</span>
                {p.name}
              </Link>
            ))}
            {item.places.map((p) => (
              <Link key={p.id} href={p.href} className={`${chipCls} border-dashed border-brick/40 bg-paper text-ink hover:text-brick-dark`}>
                <span aria-hidden className="text-brick">⌖</span>
                {p.name}
              </Link>
            ))}
            {item.href && isCall && (
              <Link href={item.href} className={`${chipCls} border-moss/40 bg-card font-medium text-moss hover:bg-moss/10`}>
                Read the conversation →
              </Link>
            )}
            {item.href && tree && (
              <Link href={item.href} className={`${chipCls} border-brick/40 bg-card font-medium text-brick-dark hover:bg-brick/10`}>
                See in family tree →
              </Link>
            )}
          </div>
        )}
        {ghost && <p className="mt-3 text-base font-medium text-moss">Tom will ask about this on a future call.</p>}
      </div>
    </motion.li>
  );
}

// ───────────────────────── life band (md+) ─────────────────────────

function LifeBand({ t }: { t: Timeline }) {
  const span = Math.max(1, t.nowYear - t.birthYear);
  const pos = (y: number) => `${((y - t.birthYear) / span) * 100}%`;
  return (
    <div className="hidden md:block" aria-label="Life at a glance">
      <div className="relative h-28 rounded-2xl border border-line bg-card px-6">
        <div className="absolute inset-x-6 top-9 h-7">
          {t.stages.map((s, i) => (
            <div
              key={s.label}
              className={`absolute top-0 flex h-7 items-center overflow-hidden whitespace-nowrap px-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-soft ${
                i % 2 ? "bg-paper-dark/70" : "bg-paper-dark"
              } ${i === 0 ? "rounded-l-full" : ""} ${i === t.stages.length - 1 ? "rounded-r-full" : ""}`}
              style={{ left: pos(s.from), width: `calc(${pos(s.to)} - ${pos(s.from)})` }}
              title={`${s.label} · ${s.from}–${s.to}`}
            >
              {s.label}
            </div>
          ))}
          {t.items.map((i) =>
            i.year == null ? null : (
              <a
                key={i.id}
                href={`#${i.id}`}
                title={`${i.yearLabel} · ${i.title}`}
                aria-label={`${i.yearLabel}: ${i.title}`}
                className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-card transition-transform hover:scale-150 focus-visible:scale-150 focus-visible:outline-3 focus-visible:outline-brick ${
                  i.kind === "call"
                    ? "bg-moss"
                    : i.kind === "not-yet-told"
                      ? "border-2 border-dashed border-moss bg-card"
                      : i.kind === "tree"
                        ? "rotate-45 rounded-none border-2 border-brick bg-card"
                        : i.approx
                          ? "border-2 border-dashed border-brick bg-card"
                          : "bg-brick"
                }`}
                style={{ left: pos(i.year) }}
              />
            ),
          )}
        </div>
        <div className="absolute inset-x-6 bottom-3 h-5 text-sm text-ink-soft">
          <span className="absolute -translate-x-1/2 font-medium text-ink" style={{ left: pos(t.birthYear) }}>
            {t.birthYear}
          </span>
          {t.decades.map((d) => (
            <span key={d} className="absolute -translate-x-1/2" style={{ left: pos(d) }}>
              {d}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        <span className="mr-4">
          <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-brick align-middle" /> told by Grandpa
        </span>
        <span className="mr-4">
          <span className="mr-1.5 inline-block h-3 w-3 rounded-full border-2 border-dashed border-brick align-middle" /> approximate year
        </span>
        <span className="mr-4">
          <span className="mr-1.5 inline-block h-3 w-3 rotate-45 border-2 border-brick align-middle" /> from the family tree
        </span>
        <span>
          <span className="mr-1.5 inline-block h-3 w-3 rounded-full bg-moss align-middle" /> calls with Tom
        </span>
      </p>
    </div>
  );
}

// ───────────────────────── decade jump nav ─────────────────────────

function DecadeNav({ blocks }: { blocks: DecadeBlock[] }) {
  const [active, setActive] = useState<number | null>(null);
  const decades = blocks.filter((b): b is Extract<DecadeBlock, { kind: "decade" }> => b.kind === "decade").map((b) => b.decade);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = decades.map((d) => document.getElementById(`decade-${d}`)).filter((x): x is HTMLElement => !!x);
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(Number(vis[0].target.id.replace("decade-", "")));
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decades.join(",")]);

  return (
    <nav
      aria-label="Jump to decade"
      className="sticky top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-10 -mx-2 overflow-x-auto bg-paper/90 px-2 py-3 backdrop-blur"
    >
      <ol className="flex min-w-max gap-2">
        {blocks.map((b) =>
          b.kind === "decade" ? (
            <li key={b.decade}>
              <a
                href={`#decade-${b.decade}`}
                aria-current={active === b.decade ? "true" : undefined}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-base font-medium transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick ${
                  active === b.decade ? "border-brick bg-brick text-white" : "border-line bg-card text-ink hover:border-brick/50"
                }`}
              >
                {b.decade}s
                <span className={`text-sm ${active === b.decade ? "text-white/80" : "text-ink-soft"}`}>{b.items.length}</span>
              </a>
            </li>
          ) : (
            <li key={`gap-${b.from}`} className="inline-flex min-h-11 items-center px-1 text-sm text-ink-soft/70" aria-hidden>
              · · ·
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

// ───────────────────────── main ─────────────────────────

export function LifeTimeline({ t, grandchild = "Tom" }: { t: Timeline; grandchild?: string }) {
  const blocks = groupByDecade(t.items, t.birthYear, t.nowYear);
  let idx = 0;

  return (
    <div>
      <LifeBand t={t} />
      <div className="mt-8">
        <DecadeNav blocks={blocks} />
      </div>

      <div className="relative mt-6">
        {/* vertical rail */}
        <div className="absolute bottom-6 left-[1.1rem] top-2 w-0.5 bg-gradient-to-b from-brick/40 via-line to-moss/40 sm:left-[1.35rem]" aria-hidden />

        {blocks.map((b) =>
          b.kind === "decade" ? (
            <section key={b.decade} id={`decade-${b.decade}`} className="scroll-mt-36 pb-10" aria-labelledby={`decade-h-${b.decade}`}>
              <div className="relative mb-5 flex items-baseline gap-4 pl-14 sm:pl-16">
                <h2
                  id={`decade-h-${b.decade}`}
                  className="font-(family-name:--font-display) text-5xl font-medium tracking-tight text-ink sm:text-6xl"
                >
                  {b.decade}
                  <em className="italic text-brick">s</em>
                </h2>
                <span className="text-base text-ink-soft">{ageRange(b.decade, t.birthYear, t.nowYear)}</span>
              </div>
              <ol className="space-y-5">
                {b.items.map((item) => (
                  <ItemCard key={item.id} item={item} index={idx++} />
                ))}
              </ol>
            </section>
          ) : (
            <div key={`gap-${b.from}`} className="relative pb-10 pl-14 sm:pl-16">
              <div className="rounded-2xl border border-dashed border-line bg-paper px-5 py-4 text-base text-ink-soft">
                <span className="font-(family-name:--font-display) text-xl text-ink">
                  {b.from === b.to ? `The ${b.from}s` : `${b.from}s – ${b.to}s`}
                </span>
                <span className="mx-2">·</span>
                Grandpa hasn’t told us about these years yet. {grandchild} will get there.
              </div>
            </div>
          ),
        )}
      </div>

      {t.undated.length > 0 && (
        <section className="mt-6 rounded-2xl border-2 border-dashed border-moss/40 bg-moss/5 p-5 sm:p-7" aria-labelledby="undated-h">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-moss">Year unknown</p>
          <h2 id="undated-h" className="mt-1 font-(family-name:--font-display) text-3xl font-medium text-ink">
            When did these happen? <em className="italic text-moss">{grandchild} will ask.</em>
          </h2>
          <ol className="relative mt-6 space-y-5">
            {t.undated.map((item) => (
              <ItemCard key={item.id} item={item} index={0} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
