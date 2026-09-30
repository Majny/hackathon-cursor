"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const LINES: { who: "Tom" | "Grandpa Jarda"; text: string }[] = [
  { who: "Tom", text: "Grandpa, what did Kladno smell like when you were a boy?" },
  { who: "Grandpa Jarda", text: "Coal and hot iron. The whole town breathed with the steelworks." },
  { who: "Tom", text: "And Pepa? Was he there too?" },
  { who: "Grandpa Jarda", text: "Pepa was always there. That rascal talked me into the fair in Prague…" },
];

const BARS = 36;
// Deterministic "random" amplitudes (no Math.random → no hydration mismatch).
const AMPS = Array.from({ length: BARS }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

function Orb() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[460px]">
      {/* expanding rings */}
      {!reduce &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-[18%] rounded-full border border-brick/30"
            initial={{ scale: 0.9, opacity: 0.6 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 4.5, repeat: Infinity, delay: i * 1.5, ease: "easeOut" }}
          />
        ))}
      {/* glow */}
      <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(180,83,42,0.28),transparent_65%)] blur-2xl" />
      {/* orb */}
      <motion.div
        className="absolute inset-[22%] rounded-full shadow-[0_40px_80px_-20px_rgba(143,63,31,0.55),inset_0_-20px_60px_rgba(59,42,30,0.35),inset_0_20px_50px_rgba(255,240,215,0.55)]"
        style={{
          background:
            "radial-gradient(circle at 34% 28%, #ffe9c9 0%, #eaa672 22%, #c4652f 48%, #8f3f1f 78%, #5a2612 100%)",
        }}
        animate={reduce ? undefined : { scale: [1, 1.035, 0.99, 1.02, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* waveform inside the orb */}
        <div className="absolute inset-0 flex items-center justify-center gap-[3px] px-[16%]">
          {AMPS.map((a, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-[#fff6e8]/85"
              style={{ height: `${a * 38}%` }}
              animate={reduce ? undefined : { scaleY: [0.35, 1, 0.5, 0.85, 0.35] }}
              transition={{ duration: 1.6 + (i % 5) * 0.18, repeat: Infinity, delay: (i % 9) * 0.09, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function Transcript() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LINES.length), 3200);
    return () => clearInterval(t);
  }, []);
  const line = LINES[idx];
  const isTom = line.who === "Tom";
  return (
    <div className="pointer-events-none absolute inset-x-0 -bottom-4 flex justify-center px-2 sm:bottom-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 1, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={`max-w-sm rounded-2xl border px-4 py-3 text-[0.85rem] leading-snug shadow-[0_18px_40px_-18px_rgba(59,42,30,0.35)] backdrop-blur ${
            isTom ? "border-line bg-card/90 text-ink" : "border-brick/25 bg-[#fff3e6]/95 text-ink"
          }`}
        >
          <div className={`mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${isTom ? "text-moss" : "text-brick"}`}>
            {isTom ? "Tom · AI grandson" : "Grandpa Jarda · b. 1946, Kladno"}
          </div>
          <span className="font-(family-name:--font-display) text-[1.02rem] italic">“{line.text}”</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const rise = (d: number) =>
    reduce
      ? {}
      : {
          // Hero stays visible even if the entrance animation never runs (e.g. throttled tab on a projector).
          initial: { opacity: 1, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.9, delay: d, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(232,185,35,0.18),transparent_60%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-24 pt-10 md:grid-cols-[1.15fr_1fr] md:pt-16 lg:gap-16">
        <div>
          <motion.div {...rise(0)} className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1.5 text-[0.72rem] font-medium text-ink-soft">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-moss opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-moss" />
            </span>
            Voice AI biographer for grandparents
          </motion.div>

          <motion.h1
            {...rise(0.08)}
            className="font-(family-name:--font-display) text-[2.9rem] leading-[0.98] tracking-[-0.02em] text-ink sm:text-[3.8rem] lg:text-[4.6rem]"
          >
            Your family&apos;s stories,
            <br />
            <span className="italic text-brick">in their own voice.</span>
          </motion.h1>

          <motion.p {...rise(0.18)} className="mt-7 max-w-xl text-[1.12rem] leading-relaxed text-ink-soft">
            Grandpa just talks. Heirloom listens, remembers, and writes his life story — linked to your family tree.
          </motion.p>

          <motion.div {...rise(0.28)} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/talk"
              className="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.95rem] font-semibold text-paper shadow-[0_14px_30px_-12px_rgba(59,42,30,0.6)] transition hover:-translate-y-0.5 hover:bg-brick-dark"
            >
              Talk to Tom
              <span className="transition group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#call"
              className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brick/50 hover:text-brick"
            >
              📞 Call Grandpa
            </a>
          </motion.div>
          <motion.p {...rise(0.36)} className="mt-4 text-[0.78rem] text-ink-soft/80">
            no app · no typing · just a conversation
          </motion.p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 1, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <Orb />
          <Transcript />
        </motion.div>
      </div>
    </section>
  );
}
