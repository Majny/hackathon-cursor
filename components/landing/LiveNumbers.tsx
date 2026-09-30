"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

type Stats = { calls: number; memories: number; people: number };

// Shown when the API is unreachable (e.g. static preview). Mirrors the demo snapshot.
const FALLBACK: Stats = { calls: 2, memories: 14, people: 6 };

export function LiveNumbers() {
  const [stats, setStats] = useState<Stats>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.entities(), api.listSessions()])
      .then(([ent, sessions]) => {
        if (cancelled) return;
        setStats({
          calls: sessions.length,
          memories: (ent.events?.length ?? 0) + (ent.places?.length ?? 0),
          people: ent.persons?.length ?? 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const items = [
    { label: "calls", value: stats.calls, href: "/family/conversations" },
    { label: "events and places", value: stats.memories, href: "/family/timeline" },
    { label: "people", value: stats.people, href: "/family/people" },
  ];

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-(family-name:--font-display) text-[2rem] leading-tight text-ink sm:text-[2.4rem]">
          Grandpa Jarda&apos;s archive so far
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className="rounded-2xl border border-line bg-card p-6 transition-colors hover:border-brick/40"
            >
              <div className="font-(family-name:--font-display) text-[2.6rem] leading-none text-ink">{it.value}</div>
              <div className="mt-2 text-[0.9rem] text-ink-soft">{it.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
