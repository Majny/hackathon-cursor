"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { NumberedCitation } from "./citations";

export function CitationChip({ c }: { c: NumberedCitation }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

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
        title="Zobrazit, kde to děda řekl"
        className={`mx-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-1.5 font-sans text-xs font-bold leading-none transition-colors ${
          open ? "border-brick bg-brick text-white" : "border-brick/40 bg-brick/10 text-brick-dark hover:bg-brick hover:text-white"
        }`}
      >
        {c.n}
      </button>
      {open && (
        <span
          role="dialog"
          className="absolute left-1/2 top-8 z-30 block w-[min(26rem,80vw)] -translate-x-1/2 rounded-xl border border-line bg-card p-4 text-left font-sans text-base leading-snug text-ink shadow-xl"
        >
          <span className="mb-1 block text-xs uppercase tracking-wide text-ink-soft">
            Citace {c.n} · replika {c.turnId}
          </span>
          <span className="block font-serif text-lg italic">„{c.quote || "…"}“</span>
          <Link href={c.href} className="mt-3 inline-block font-medium text-brick underline">
            Otevřít v přepisu povídání →
          </Link>
        </span>
      )}
    </span>
  );
}
