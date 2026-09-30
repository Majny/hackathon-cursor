"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { SectionLabel } from "./SectionLabel";

type Stats = { sessions: number; memories: number; people: number; live: boolean };

// Shown when the API is unreachable (e.g. static preview). Mirrors the demo snapshot.
const FALLBACK: Stats = { sessions: 2, memories: 14, people: 6, live: false };

function Counter({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = Math.round(v).toString();
      },
    });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref}>0</span>;
}

export function LiveNumbers() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.entities(), api.listSessions()])
      .then(([ent, sessions]) => {
        if (cancelled) return;
        setStats({
          sessions: sessions.length,
          memories: (ent.events?.length ?? 0) + (ent.places?.length ?? 0),
          people: ent.persons?.length ?? 0,
          live: true,
        });
      })
      .catch(() => {
        if (!cancelled) setStats(FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const s = stats ?? FALLBACK;
  const items = [
    { label: "Conversations with Grandpa", value: s.sessions },
    { label: "Memories captured (events & places)", value: s.memories },
    { label: "People found in his stories", value: s.people },
  ];

  return (
    <section className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel num="03" dark>
              Right now, in this demo
            </SectionLabel>
            <h2 className="font-(family-name:--font-display) max-w-2xl text-[2.2rem] leading-[1.08] sm:text-[2.8rem]">
              Grandpa Jarda&apos;s archive, <span className="italic text-warn">live.</span>
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-3 py-1.5 text-[0.72rem] text-paper/70">
            <span className={`h-2 w-2 rounded-full ${stats?.live ? "animate-pulse bg-moss" : "bg-paper/40"}`} />
            {stats === null ? "Connecting…" : stats.live ? "Live from /api" : "Demo snapshot"}
          </span>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-paper/10 sm:grid-cols-3">
          {items.map((it) => (
            <div key={it.label} className="bg-ink p-8">
              <div className="font-(family-name:--font-display) text-[4.2rem] leading-none text-paper">
                <Counter key={`${it.label}-${it.value}`} value={it.value} />
              </div>
              <div className="mt-3 text-[0.85rem] text-paper/65">{it.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
