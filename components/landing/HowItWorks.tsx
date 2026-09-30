"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { SectionLabel } from "./SectionLabel";

type StepKey = "talk" | "remember" | "write" | "connect";

const STEPS: { key: StepKey; num: string; title: string; blurb: string }[] = [
  { key: "talk", num: "01", title: "Talk", blurb: "Tom, a warm AI grandson, calls Grandpa on WhatsApp and asks gentle questions. Grandpa just answers." },
  { key: "remember", num: "02", title: "Remember", blurb: "Every session is summarised. Next time Tom picks up exactly where grandpa left off." },
  { key: "write", num: "03", title: "Write", blurb: "Stories become book chapters. Every sentence is cited back to grandpa’s own words." },
  { key: "connect", num: "04", title: "Connect", blurb: "People from the stories are matched to your family tree and exported as GEDCOM." },
];

const ease = [0.22, 1, 0.36, 1] as const;

/* ---------- 01 Talk ---------- */
function TalkPanel() {
  const lines = [
    { tom: true, text: "Good afternoon, Grandpa! Shall we talk about Kladno today?" },
    { tom: false, text: "Kladno… I started at the Poldi steelworks when I was fifteen." },
    { tom: true, text: "Fifteen! What was your very first day like?" },
    { tom: false, text: "Loud. Hot. And the foreman shouted at me in front of everyone." },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      {lines.map((l, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12, x: l.tom ? -8 : 8 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ delay: 0.25 + i * 0.7, duration: 0.5, ease }}
          className={`max-w-[85%] rounded-2xl px-4 py-3 text-[0.92rem] leading-snug ${
            l.tom ? "self-start rounded-bl-md bg-paper-dark text-ink" : "self-end rounded-br-md bg-brick text-paper"
          }`}
        >
          <div className={`mb-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${l.tom ? "text-moss" : "text-paper/75"}`}>
            {l.tom ? "Tom" : "Grandpa Jarda"}
          </div>
          {l.text}
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.1 }}
        className="mt-1 flex items-center gap-2 self-start text-[0.75rem] text-ink-soft"
      >
        <span className="flex gap-1">
          {[0, 1, 2].map((d) => (
            <motion.span
              key={d}
              className="h-1.5 w-1.5 rounded-full bg-ink-soft"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
            />
          ))}
        </span>
        Tom is listening…
      </motion.div>
    </div>
  );
}

/* ---------- 02 Remember ---------- */
function RememberPanel() {
  const sessions = [
    { n: "Session 1", day: "Tuesday", tags: ["Poldi steelworks", "foreman", "1961"] },
    { n: "Session 2", day: "Thursday", tags: ["Pepa", "fair in Prague", "open thread"] },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {sessions.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.25, duration: 0.5, ease }}
            className="rounded-xl border border-line bg-paper/70 p-4"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[0.8rem] font-semibold text-ink">{s.n}</span>
              <span className="text-[0.7rem] text-ink-soft">{s.day}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.tags.map((t) => (
                <span
                  key={t}
                  className={`rounded-full px-2 py-0.5 text-[0.68rem] ${
                    t === "open thread" ? "bg-warn-soft text-ink" : "bg-card text-ink-soft ring-1 ring-line"
                  }`}
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 0.6, ease }}
        className="relative rounded-2xl bg-ink p-6 text-paper shadow-[0_24px_50px_-24px_rgba(59,42,30,0.8)]"
      >
        <div className="mb-2 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-warn">
          <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Session 3 · Tom opens with
        </div>
        <p className="font-(family-name:--font-display) text-[1.35rem] leading-snug italic">
          “Last time you started telling me how you and Pepa ran off to the fair in Prague…”
        </p>
        <p className="mt-3 text-[0.78rem] text-paper/60">Memory across sessions — no repeated questions, no lost threads.</p>
      </motion.div>
    </div>
  );
}

/* ---------- 03 Write ---------- */
function Cite({ n, quote, meta }: { n: number; quote: string; meta: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block align-baseline">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className={`mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-sans text-[0.62rem] font-bold not-italic transition ${
          open ? "bg-brick text-paper" : "bg-brick/12 text-brick ring-1 ring-brick/30 hover:bg-brick hover:text-paper"
        }`}
        aria-label={`Source ${n}`}
      >
        {n}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-1/2 z-20 mb-2 block w-72 -translate-x-1/2 rounded-xl bg-ink p-4 text-left font-sans text-[0.8rem] leading-snug text-paper shadow-2xl"
          >
            <span className="mb-1 block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-warn">Grandpa said, word for word</span>
            <span className="font-(family-name:--font-display) block text-[0.98rem] italic">“{quote}”</span>
            <span className="mt-2 block text-[0.68rem] text-paper/55">{meta}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function WritePanel() {
  return (
    <div className="flex h-full flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="rounded-2xl border border-line bg-card p-7 shadow-[0_30px_60px_-35px_rgba(59,42,30,0.5)]"
      >
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-ink-soft">Chapter 2 · The steelworks</div>
        <h4 className="font-(family-name:--font-display) mt-2 text-[1.6rem] leading-tight text-ink">Fifteen, and fire everywhere</h4>
        <p className="font-(family-name:--font-display) mt-4 text-[1.08rem] leading-[1.75] text-ink">
          At fifteen, Jaroslav walked through the gates of the Poldi steelworks in Kladno for the first time.
          <Cite n={1} quote="I started at the Poldi steelworks when I was fifteen." meta="Session 1 · turn 7 · 12:04" /> The noise
          and the heat never left his memory, and neither did the foreman who scolded him in front of the whole shift.
          <Cite n={2} quote="Loud. Hot. And the foreman shouted at me in front of everyone." meta="Session 1 · turn 9 · 12:06" />
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-[0.72rem] text-ink-soft">
          <span className="rounded-full bg-moss/15 px-2.5 py-1 font-semibold text-moss">✓ 2 of 2 sentences cited</span>
          <span>Hover a number to see the exact quote.</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------- 04 Connect ---------- */
type Node = { id: string; name: string; sub: string; x: number; y: number; hl?: boolean };
const NODES: Node[] = [
  { id: "f", name: "František Novák", sub: "1919–1988", x: 26, y: 13 },
  { id: "a", name: "Anna Nováková", sub: "1922–2001", x: 58, y: 13 },
  { id: "j", name: "Jaroslav Novák", sub: "*1946 Kladno", x: 20, y: 55, hl: true },
  { id: "v", name: "Věra Dvořáková", sub: "*1950 Kladno", x: 55, y: 55 },
  { id: "p", name: "Josef Dvořák", sub: "*1948 Kladno", x: 84, y: 55 },
];

function ConnectPanel() {
  const [snapped, setSnapped] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSnapped(true), 1400);
    return () => clearTimeout(t);
  }, []);
  const pos = (id: string) => NODES.find((n) => n.id === id)!;
  const line = (a: string, b: string) => {
    const A = pos(a);
    const B = pos(b);
    return `M ${A.x} ${A.y + 6} C ${A.x} ${(A.y + B.y) / 2 + 3}, ${B.x} ${(A.y + B.y) / 2 + 3}, ${B.x} ${B.y - 6}`;
  };
  return (
    <div className="flex h-full flex-col justify-center gap-5">
      <div className="relative h-[260px] rounded-2xl border border-line bg-[linear-gradient(180deg,#fffdf8,#f7efe0)]">
        <svg viewBox="0 0 100 80" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <line x1="26" y1="13" x2="58" y2="13" stroke="#e2d5bd" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          <line x1="55" y1="55" x2="84" y2="55" stroke="#e2d5bd" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
          {["j", "v"].map((c) => (
            <motion.path
              key={c}
              d={line(c === "j" ? "f" : "a", c)}
              fill="none"
              stroke="#c9b28e"
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.9, ease }}
            />
          ))}
        </svg>
        {NODES.map((n, i) => {
          const target = n.id === "p";
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              style={{ left: `${n.x}%`, top: `${(n.y / 80) * 100}%` }}
              className={`absolute w-[7.2rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border px-2 py-1.5 text-center shadow-sm transition-colors duration-500 ${
                target && snapped
                  ? "border-moss bg-moss/10 ring-4 ring-moss/20"
                  : n.hl
                    ? "border-brick/40 bg-[#fff3e6]"
                    : "border-line bg-card"
              }`}
            >
              <div className="text-[0.68rem] font-semibold leading-tight text-ink">{n.name}</div>
              <div className="text-[0.6rem] text-ink-soft">{n.sub}</div>
            </motion.div>
          );
        })}
        {/* the "Pepa" chip from the story flying onto the tree node */}
        <motion.div
          initial={{ left: "50%", top: "96%", scale: 1.1 }}
          animate={snapped ? { left: "66%", top: "88%", scale: 1 } : { left: "50%", top: "96%", scale: 1.1 }}
          transition={{ type: "spring", stiffness: 140, damping: 16 }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-brick px-3 py-1 text-[0.72rem] font-semibold text-paper shadow-lg">
            “Pepa” {snapped ? "→ Josef Dvořák *1948 ✓" : "from Session 2"}
          </span>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.5 }}
        className="flex flex-wrap items-center gap-3"
      >
        <a
          href={api.gedcomUrl()}
          className="group inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[0.85rem] font-semibold text-paper transition hover:bg-brick-dark"
        >
          Download GEDCOM <span className="transition group-hover:translate-x-1">→</span>
        </a>
        <div className="flex flex-wrap gap-1.5 text-[0.72rem] text-ink-soft">
          {["MyHeritage", "Geni", "FamilySearch"].map((p) => (
            <span key={p} className="rounded-full border border-line bg-card px-2.5 py-1">
              {p}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

const PANELS: Record<StepKey, () => React.JSX.Element> = {
  talk: TalkPanel,
  remember: RememberPanel,
  write: WritePanel,
  connect: ConnectPanel,
};

const AUTO_MS = 7000;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), AUTO_MS);
    return () => clearTimeout(t);
  }, [active, auto]);

  const step = STEPS[active];
  const Panel = PANELS[step.key];

  return (
    <section id="how" className="mx-auto max-w-6xl px-6 py-24">
      <SectionLabel num="02">How it works</SectionLabel>
      <h2 className="font-(family-name:--font-display) max-w-3xl text-[2.4rem] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[3.1rem]">
        Four steps from a phone call <span className="italic text-brick">to a family heirloom.</span>
      </h2>

      <div className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div className="flex flex-col gap-2" role="tablist" aria-label="How Heirloom works">
          {STEPS.map((s, i) => {
            const on = i === active;
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={on}
                type="button"
                onClick={() => {
                  setActive(i);
                  setAuto(false);
                }}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition ${
                  on ? "border-brick/30 bg-card shadow-[0_20px_40px_-28px_rgba(59,42,30,0.6)]" : "border-transparent hover:bg-card/60"
                }`}
              >
                <div className="flex items-baseline gap-4">
                  <span className={`font-(family-name:--font-display) text-[1.1rem] italic ${on ? "text-brick" : "text-ink-soft/60"}`}>{s.num}</span>
                  <div>
                    <div className={`font-(family-name:--font-display) text-[1.55rem] leading-tight ${on ? "text-ink" : "text-ink-soft"}`}>{s.title}</div>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease }}
                          className="overflow-hidden pt-1.5 text-[0.9rem] leading-relaxed text-ink-soft"
                        >
                          {s.blurb}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {on && auto && (
                  <motion.span
                    key={`bar-${active}`}
                    className="absolute bottom-0 left-0 h-[2px] bg-brick"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: AUTO_MS / 1000, ease: "linear" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="relative min-h-[430px] rounded-[1.75rem] border border-line bg-card/60 p-5 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease }}
              className="h-full"
              onMouseEnter={() => setAuto(false)}
            >
              <Panel />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
