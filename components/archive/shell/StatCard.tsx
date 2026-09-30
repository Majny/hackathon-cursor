"use client";

import Link from "next/link";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Number that counts up from 0 the first time it scrolls into view. SSR renders the final value. */
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || reduce || started.current || value <= 0) return;
    started.current = true;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown}
    </span>
  );
}

/** One tile of the "at a glance" stat row. Whole tile is a link. */
export function StatCard({
  value,
  suffix,
  label,
  hint,
  href,
  tone = "ink",
}: {
  value: number;
  suffix?: string;
  label: string;
  hint?: string;
  href: string;
  tone?: "ink" | "moss" | "brick";
}) {
  const color = tone === "moss" ? "text-moss" : tone === "brick" ? "text-brick" : "text-ink";
  return (
    <Link
      href={href}
      className="group flex min-h-11 flex-col rounded-2xl border border-line bg-card p-4 shadow-[0_1px_0_rgba(59,42,30,0.04)] transition hover:-translate-y-0.5 hover:border-brick/40 hover:shadow-[0_10px_24px_-16px_rgba(59,42,30,0.45)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick sm:p-5"
    >
      <span className={`font-(family-name:--font-display) text-[2.4rem] leading-none font-medium ${color}`}>
        <CountUp value={value} />
        {suffix && <span className="text-[1.3rem] text-ink-soft">{suffix}</span>}
      </span>
      <span className="mt-2 text-[0.72rem] font-semibold tracking-[0.18em] text-ink-soft uppercase">{label}</span>
      {hint && <span className="mt-1 text-sm text-ink-soft group-hover:text-brick">{hint}</span>}
    </Link>
  );
}
