// Small server-safe building blocks for the Conversations pages (local to this folder,
// so these pages do not depend on the shared components landing in time).
import Link from "next/link";
import type { ReactNode } from "react";
import { linkEntities, type EntityLink } from "@/lib/archive";

export const focusRing =
  "focus-visible:outline-3 focus-visible:outline-brick focus-visible:outline-offset-2";

export function Crumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[0.85rem] text-ink-soft">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-line">/</span>}
            {c.href ? (
              <Link href={c.href} className={`rounded hover:text-brick ${focusRing}`}>{c.label}</Link>
            ) : (
              <span aria-current="page" className="text-ink">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Label({ num, children }: { num?: string; children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-brick">
      {num && <span className="font-(family-name:--font-display) text-base normal-case italic tracking-normal text-ink-soft">{num}</span>}
      <span className="h-px w-10 bg-brick/40" />
      <span>{children}</span>
    </div>
  );
}

export function Pill({
  href,
  children,
  tone = "neutral",
  title,
}: {
  href?: string;
  children: ReactNode;
  tone?: "neutral" | "brick" | "moss" | "warn";
  title?: string;
}) {
  const tones = {
    neutral: "border-line bg-card text-ink hover:border-brick/40 hover:text-brick",
    brick: "border-brick/30 bg-brick/8 text-brick-dark hover:bg-brick/15",
    moss: "border-moss/30 bg-moss/10 text-moss hover:bg-moss/15",
    warn: "border-warn bg-warn-soft text-ink hover:bg-warn-soft/70",
  } as const;
  const cls = `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-[0.85rem] font-medium transition ${tones[tone]} ${focusRing}`;
  return href ? (
    <Link href={href} className={cls} title={title}>{children}</Link>
  ) : (
    <span className={cls} title={title}>{children}</span>
  );
}

/** Auto-links the first mention of each person / place in `text`. */
export function ConvLinkedText({ text, links }: { text: string; links: EntityLink[] }) {
  const parts = linkEntities(text, links);
  return (
    <>
      {parts.map((p, i) =>
        p.link ? (
          <Link
            key={i}
            href={p.link.href}
            className={`rounded-sm underline decoration-brick/40 decoration-2 underline-offset-4 transition hover:bg-brick/10 hover:text-brick-dark hover:decoration-brick ${focusRing}`}
            title={p.link.kind === "person" ? "Open person" : "Open place"}
          >
            {p.text}
          </Link>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function WhatsAppGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}
