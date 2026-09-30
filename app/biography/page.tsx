"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Store = {
  chapter: { title: string; body: string } | null;
  sessions: { index: number; summary: string; endedAt?: string }[];
  entities: { kind: string; name: string; place?: string; year?: number }[];
  matches: { status: string; score: number; entityId: string; treePersonId: string }[];
};

export default function BiographyPage() {
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then(setStore);
  }, []);

  return (
    <main className="shell">
      <nav className="top">
        <h1 className="brand">Family reading page</h1>
        <Link href="/">← Back to talk</Link>
      </nav>
      <p className="lede">
        A quiet place for the family to read what was said — not invented. Chapters cite
        the recorded sessions.
      </p>

      <section className="panel">
        <h2>{store?.chapter?.title ?? "No chapter yet"}</h2>
        <div className="chapter">{store?.chapter?.body ?? "Generate a chapter from the talk page first."}</div>
      </section>

      <section className="panel">
        <h2>Session memory</h2>
        {(store?.sessions ?? [])
          .filter((s) => s.endedAt)
          .map((s) => (
            <div key={s.index} className="entity">
              <strong>Session {s.index}</strong>
              <div className="meta">{s.summary}</div>
            </div>
          ))}
      </section>

      <section className="panel">
        <h2>People & places</h2>
        {(store?.entities ?? []).map((e, i) => (
          <div key={i} className="entity">
            <strong>
              {e.kind}: {e.name}
            </strong>
            <div className="meta">{[e.place, e.year].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </section>
    </main>
  );
}
