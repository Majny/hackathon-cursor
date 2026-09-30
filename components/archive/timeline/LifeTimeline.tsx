"use client";

import Link from "next/link";
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
  if (i.kind === "birth") return i.yearLabel;
  return `${i.yearLabel} · age ${i.age}`;
}

const SOURCE_LABEL: Record<TimelineItem["kind"], string> = {
  birth: "Born",
  event: "From his calls",
  tree: "From the family tree",
  call: "Call with Tom",
  "not-yet-told": "Not yet told",
};

// ───────────────────────── markers ─────────────────────────

function Marker({ item }: { item: TimelineItem }) {
  const cls =
    item.kind === "call"
      ? "bg-moss"
      : item.kind === "not-yet-told"
        ? "border-2 border-dashed border-ink-soft bg-paper"
        : item.kind === "tree" || item.approx
          ? "border-2 border-brick bg-paper"
          : "bg-brick";
  return <span aria-hidden className={`relative z-10 block h-3 w-3 rounded-full ring-4 ring-paper ${cls}`} />;
}

// ───────────────────────── item card ─────────────────────────

const linkCls =
  "inline-flex min-h-11 items-center text-base text-brick underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";

function ItemCard({ item }: { item: TimelineItem; index?: number }) {
  const q = item.quotes[0];
  const isCall = item.kind === "call";
  const ghost = item.kind === "not-yet-told";
  const tree = item.kind === "tree";

  return (
    <li id={item.id} className="relative scroll-mt-40 pl-10">
      <div className="absolute left-[0.6rem] top-2">
        <Marker item={item} />
      </div>

      <p className="text-sm text-ink-soft">
        <span className="font-semibold text-ink">{whenLine(item)}</span>
        {item.approx && item.kind === "event" && " (approximate)"}
        {" · "}
        {SOURCE_LABEL[item.kind]}
      </p>

      <h3 className="mt-1 font-(family-name:--font-display) text-[1.35rem] leading-snug text-ink">{item.title}</h3>
      {item.description && <p className="mt-1 max-w-[65ch] leading-relaxed text-ink-soft">{item.description}</p>}

      {q && (
        <figure className="mt-3 border-l-2 border-line pl-4">
          <blockquote className="max-w-[65ch] leading-relaxed text-ink">“{q.quote}”</blockquote>
          <figcaption className="flex flex-wrap items-center gap-x-3 text-sm text-ink-soft">
            <span>
              {q.speaker}, {q.source}
            </span>
            <Link href={q.href} className={linkCls}>
              Open in call
            </Link>
          </figcaption>
        </figure>
      )}

      {(item.people.length > 0 || item.places.length > 0 || (item.href && (isCall || tree))) && (
        <p className="mt-1 flex flex-wrap items-center gap-x-4 text-sm text-ink-soft">
          {[...item.people, ...item.places].map((p) => (
            <Link key={p.id} href={p.href} className={linkCls}>
              {p.name}
            </Link>
          ))}
          {item.href && isCall && (
            <Link href={item.href} className={linkCls}>
              Read the call
            </Link>
          )}
          {item.href && tree && (
            <Link href={item.href} className={linkCls}>
              View in tree
            </Link>
          )}
        </p>
      )}
      {ghost && <p className="mt-1 text-sm text-ink-soft">Tom will ask about this on a future call.</p>}
    </li>
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
      <ol className="flex min-w-max gap-1">
        {blocks.map((b) =>
          b.kind === "decade" ? (
            <li key={b.decade}>
              <a
                href={`#decade-${b.decade}`}
                aria-current={active === b.decade ? "true" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-3 text-base transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick ${
                  active === b.decade ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                {b.decade}s
              </a>
            </li>
          ) : (
            null
          ),
        )}
      </ol>
    </nav>
  );
}

// ───────────────────────── main ─────────────────────────

export function LifeTimeline({ t, grandchild = "Tom" }: { t: Timeline; grandchild?: string }) {
  const blocks = groupByDecade(t.items, t.birthYear, t.nowYear);

  return (
    <div>
      <DecadeNav blocks={blocks} />

      <div className="relative mt-6">
        {/* vertical rail */}
        <div className="absolute bottom-6 left-[0.95rem] top-2 w-px bg-line" aria-hidden />

        {blocks.map((b) =>
          b.kind === "decade" ? (
            <section key={b.decade} id={`decade-${b.decade}`} className="relative scroll-mt-36 pb-10" aria-labelledby={`decade-h-${b.decade}`}>
              <div className="relative mb-4 flex items-baseline gap-3 bg-paper pl-10">
                <h2 id={`decade-h-${b.decade}`} className="font-(family-name:--font-display) text-[1.8rem] leading-tight text-ink">
                  {b.decade}s
                </h2>
                <span className="text-sm text-ink-soft">{ageRange(b.decade, t.birthYear, t.nowYear)}</span>
              </div>
              <ol className="space-y-8">
                {b.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </ol>
            </section>
          ) : (
            <p key={`gap-${b.from}`} className="relative pb-10 pl-10 text-sm text-ink-soft">
              {b.from === b.to ? `${b.from}s` : `${b.from}s–${b.to}s`}: nothing told yet.
            </p>
          ),
        )}
      </div>

      {t.undated.length > 0 && (
        <section className="relative mt-4 border-t border-line pt-8" aria-labelledby="undated-h">
          <h2 id="undated-h" className="font-(family-name:--font-display) text-[1.8rem] leading-tight text-ink">
            Year unknown
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{grandchild} will ask when these happened.</p>
          <ol className="relative mt-6 space-y-8">
            {t.undated.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
