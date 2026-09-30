// Local primitives for the People & Places pages. Server-safe (no "use client").
// Prop shapes mirror the frozen shared components in docs/ARCHIVE_DESIGN.md §4,
// so they can be swapped for `@/components/archive` imports without touching call sites.
import Link from "next/link";
import type { ReactNode } from "react";
import type { QuoteRef, TreeLinkStatus } from "@/lib/archive";

export const display = "font-(family-name:--font-display)";
export const focusRing = "focus-visible:outline-3 focus-visible:outline-brick focus-visible:outline-offset-2";
export const cardCls = "rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-[0_1px_0_rgba(59,42,30,0.04)]";

export function Avatar({ initials, tone = "brick", size = 48 }: { initials: string; tone?: "brick" | "moss" | "neutral"; size?: number }) {
  const tones = {
    brick: "bg-brick/10 text-brick-dark ring-brick/25",
    moss: "bg-moss/10 text-moss ring-moss/30",
    neutral: "bg-paper-dark text-ink-soft ring-line",
  } as const;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ${tones[tone]} ${display} font-medium`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </span>
  );
}

function Leaf({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} aria-hidden>
      <path d="M13.5 2.5C7 2.5 3 5.5 3 10.5c0 1 .2 2 .6 3 .5-3.2 2.6-6 6-7.6-2.8 2-4.4 4.4-5 7.3 1 .4 1.8.5 2.6.5 5 0 6.3-5.2 6.3-11.2z" fill="currentColor" />
    </svg>
  );
}

export function TreeBadge({ status }: { status: TreeLinkStatus }) {
  const map: Record<TreeLinkStatus, { cls: string; label: string }> = {
    confirmed: { cls: "border-moss/40 bg-moss/10 text-moss", label: "In family tree" },
    suggested: { cls: "border-warn bg-warn-soft text-ink", label: "Suggested match" },
    inferred: { cls: "border-brick/30 bg-brick/10 text-brick-dark", label: "In family tree (via family)" },
    none: { cls: "border-dashed border-ink-soft/50 bg-transparent text-ink-soft", label: "Not in tree yet" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-medium ${m.cls}`}>
      <Leaf />
      {m.label}
    </span>
  );
}

export function Chip({ href, active = false, children, count, dashed = false }: { href?: string; active?: boolean; children: ReactNode; count?: number; dashed?: boolean }) {
  const cls = `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.95rem] transition-colors ${focusRing} ${
    active ? "border-brick bg-brick text-white" : `${dashed ? "border-dashed" : ""} border-line bg-card text-ink hover:border-brick/50 hover:bg-paper-dark`
  }`;
  const inner = (
    <>
      <span>{children}</span>
      {count != null && (
        <span className={`rounded-full px-2 text-sm tabular-nums ${active ? "bg-white/20 text-white" : "bg-paper-dark text-ink-soft"}`}>{count}</span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className={cls} aria-current={active ? "page" : undefined} scroll={false}>
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

export function QuoteCard({ q, size = "sm", showSource = true }: { q: QuoteRef; size?: "sm" | "lg"; showSource?: boolean }) {
  const grandpa = q.role === "grandparent";
  return (
    <figure className={`${cardCls} ${grandpa ? "" : "bg-paper-dark/60"} relative`}>
      <blockquote
        className={`${grandpa ? `${display} italic` : "text-ink-soft"} ${size === "lg" ? "text-[1.35rem] leading-[1.55]" : "text-[1.12rem] leading-[1.65]"} max-w-[65ch]`}
      >
        {grandpa ? <span className="mr-0.5 text-brick">“</span> : null}
        {q.quote}
        {grandpa ? <span className="ml-0.5 text-brick">”</span> : null}
      </blockquote>
      {showSource && (
        <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.9rem] text-ink-soft">
          <span>
            <span className="font-medium text-ink">{q.speaker}</span> · {q.source}
            {q.sessionDate ? ` · ${q.sessionDate}` : ""}
          </span>
          <Link href={q.href} className={`inline-flex min-h-11 items-center font-medium text-brick underline-offset-4 hover:underline ${focusRing}`}>
            Open in conversation →
          </Link>
        </figcaption>
      )}
    </figure>
  );
}

export function Crumbs({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-[0.92rem] text-ink-soft">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-line">/</span>}
            {c.href ? (
              <Link href={c.href} className={`underline-offset-4 hover:text-brick hover:underline ${focusRing}`}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionHeading({ num, children, aside }: { num?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <h2 className={`${display} text-[1.7rem] leading-tight text-ink`}>
        {num && <span className="mr-2 text-base italic text-ink-soft">{num}</span>}
        {children}
      </h2>
      {aside}
    </div>
  );
}

/** Postmark / stamp used as the place "avatar". */
export function Stamp({ name, size = 132, sub }: { name: string; size?: number; sub?: string }) {
  const short = name.replace(/\s*\(.*\)\s*/, "");
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-dashed border-brick/50 bg-card p-2 text-center transition-transform duration-300 group-hover:rotate-3 motion-reduce:transition-none"
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-1.5 rounded-full border border-brick/25" />
      <span className="flex flex-col items-center px-2">
        <span className={`${display} leading-tight text-brick-dark`} style={{ fontSize: Math.max(14, Math.round(size / (short.length > 9 ? 8.5 : 6.2))) }}>
          {short}
        </span>
        {sub && <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-ink-soft">{sub}</span>}
      </span>
    </span>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-card/50 p-5 text-ink-soft">{children}</p>;
}

export function ChapterRefLink({ r }: { r: { title: string; n: number; href: string; paragraphId: string } }) {
  return (
    <Link
      href={r.href}
      className={`group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-card px-4 py-2.5 hover:border-brick/50 ${focusRing}`}
    >
      <span>
        <span className={`${display} italic`}>{r.title}</span>
      </span>
      <span className="inline-flex items-center gap-2 text-sm text-ink-soft">
        cites his words
        <span className="rounded-md bg-brick/10 px-1.5 font-semibold tabular-nums text-brick-dark">[{r.n}]</span>
        <span className="text-brick transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}
