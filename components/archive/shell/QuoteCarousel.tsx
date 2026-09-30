"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { QuoteRef } from "@/lib/archive";

/** Big pull-quote that crossfades every 6 s; pauses on hover/focus; dots to jump. */
export function QuoteCarousel({ quotes, interval = 6000 }: { quotes: QuoteRef[]; interval?: number }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce || quotes.length < 2) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % quotes.length), interval);
    return () => window.clearInterval(id);
  }, [paused, reduce, quotes.length, interval]);

  if (!quotes.length) return null;
  const q = quotes[i % quotes.length];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-2 font-(family-name:--font-display) text-[9rem] leading-none text-brick/15 select-none"
      >
        “
      </span>
      <div className="relative min-h-[13rem] sm:min-h-[11rem]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.figure
            key={q.turnId}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <blockquote className="max-w-[46ch] font-(family-name:--font-display) text-[1.55rem] leading-snug text-ink italic sm:text-[1.9rem]">
              “{q.quote}”
            </blockquote>
            <figcaption className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
              <span>
                {q.speaker} · {q.source}
              </span>
              <Link href={q.href} className="font-medium text-brick underline-offset-4 hover:underline">
                Hear it in context →
              </Link>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      {quotes.length > 1 && (
        <div className="mt-6 flex items-center gap-1" role="group" aria-label="Choose a quote">
          {quotes.map((x, n) => (
            <button
              key={x.turnId}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Quote ${n + 1} of ${quotes.length}`}
              aria-current={n === i ? "true" : undefined}
              className="flex h-11 w-8 items-center justify-center"
            >
              <span className={`block h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-brick" : "w-1.5 bg-line"}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
