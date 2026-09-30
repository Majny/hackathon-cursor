import Link from "next/link";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/landing/SectionLabel";

export type Crumb = { label: string; href?: string };

/** Breadcrumb trail: "Overview / People / Pepa Dvořák". */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (!crumbs.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-[0.9rem] text-ink-soft">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-line">/</span>}
            {c.href && i < crumbs.length - 1 ? (
              <Link href={c.href} className="underline-offset-4 hover:text-brick hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === crumbs.length - 1 ? "page" : undefined} className="text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Standard archive page header. `title` may contain an <em className="italic text-brick"> accent word.
 * Usage: <PageHeader num="01" label="Everyone he remembers" title={<>Everyone he <em>remembers</em></>} />
 */
export function PageHeader({
  num,
  label,
  title,
  lede,
  crumbs = [],
  aside,
}: {
  num?: string;
  label?: string;
  title: ReactNode;
  lede?: ReactNode;
  crumbs?: Crumb[];
  aside?: ReactNode;
}) {
  return (
    <header className="pb-8">
      <Breadcrumbs crumbs={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-3xl">
          {label && <SectionLabel num={num ?? "—"}>{label}</SectionLabel>}
          <h1 className="font-(family-name:--font-display) text-[2.4rem] leading-[1.05] font-medium tracking-tight text-ink sm:text-[3.1rem] [&_em]:text-brick [&_em]:italic">
            {title}
          </h1>
          {lede && <p className="mt-3 max-w-[60ch] text-[1.1rem] leading-relaxed text-ink-soft">{lede}</p>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </header>
  );
}
