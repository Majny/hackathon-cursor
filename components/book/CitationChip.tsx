"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/** Minimal shape shared by NumberedCitation (citations.ts) and CitedParagraph.numbered (lib/archive). */
export interface ChipCitation {
  n: number;
  turnId: string;
  quote: string;
  href: string;
  source?: string;
}

export function CitationChip({ c, speaker = "Grandpa" }: { c: ChipCitation; speaker?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-super">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={popId}
        aria-label={`Source ${c.n}: show where ${speaker} said this`}
        className={`mx-0.5 inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 font-sans text-xs font-bold leading-none transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick ${
          open ? "border-brick bg-brick text-white" : "border-brick/40 bg-brick/10 text-brick-dark hover:bg-brick hover:text-white"
        }`}
      >
        {c.n}
      </button>
      {open && (
        <span
          id={popId}
          role="dialog"
          className="absolute left-1/2 top-9 z-30 block w-[min(26rem,80vw)] -translate-x-1/2 rounded-2xl border border-line bg-card p-5 text-left font-sans text-base leading-snug text-ink shadow-[0_18px_40px_-12px_rgba(59,42,30,0.35)]"
        >
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-brick">
            Source {c.n}
          </span>
          <span className="block font-(family-name:--font-display) text-lg italic leading-relaxed">“{c.quote || "…"}”</span>
          <span className="mt-2 block text-sm text-ink-soft">
            {speaker}
            {c.source ? ` · ${c.source}` : ""}
          </span>
          <Link
            href={c.href}
            className="mt-3 inline-flex min-h-11 items-center font-medium text-brick underline underline-offset-4 hover:text-brick-dark"
          >
            Hear it in the conversation →
          </Link>
        </span>
      )}
    </span>
  );
}
