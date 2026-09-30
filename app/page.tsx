"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Message = { role: string; content: string; at: string };
type Session = {
  id: string;
  index: number;
  messages: Message[];
  summary: string;
  openThreads: string[];
  endedAt?: string;
};
type Entity = {
  id: string;
  kind: string;
  name: string;
  place?: string;
  year?: number;
  notes?: string;
};
type Match = {
  entityId: string;
  treePersonId: string;
  score: number;
  reasons: string[];
  status: string;
};
type Chapter = { title: string; body: string };
type Store = {
  sessions: Session[];
  activeSessionId: string | null;
  entities: Entity[];
  matches: Match[];
  chapter: Chapter | null;
};

type Status = {
  voiceAvailable: boolean;
  llmProvider: string | null;
  sessionCount: number;
};

const SAMPLE =
  "When I was a boy in Kladno, my friend Pepa and I climbed the slag heaps after school. He was born in 1948, same year as me, and his dad worked at the steelworks.";

export default function HomePage() {
  const [store, setStore] = useState<Store | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<
    { id: string; givenName: string; surname: string; birthYear: number; place: string }[]
  >([]);

  const refresh = useCallback(async () => {
    const [s, st] = await Promise.all([
      fetch("/api/session").then((r) => r.json()),
      fetch("/api/status").then((r) => r.json()),
    ]);
    setStore(s);
    setStatus(st);
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/tree")
      .then((r) => r.json())
      .then(setTree)
      .catch(() => {});
  }, [refresh]);

  const active = useMemo(
    () => store?.sessions.find((s) => s.id === store.activeSessionId) ?? null,
    [store]
  );

  async function sessionAction(action: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Session error");
      setStore(data);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat error");
      setStore(data.store);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function processStory() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/process", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Process error");
      setStore(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function decideMatch(
    entityId: string,
    treePersonId: string,
    decision: "confirmed" | "rejected"
  ) {
    setBusy(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId, treePersonId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Match error");
      setStore(data);
    } finally {
      setBusy(false);
    }
  }

  async function tryVoice() {
    setVoiceMsg(null);
    const res = await fetch("/api/voice", { method: "POST" });
    const data = await res.json();
    setVoiceMsg(data.message);
  }

  const personById = (id: string) => tree.find((t) => t.id === id);

  return (
    <main className="shell">
      <nav className="top">
        <div>
          <p className="meta" style={{ margin: 0 }}>
            For the stories that stop too soon
          </p>
          <h1 className="brand">And Then</h1>
        </div>
        <Link href="/biography">Family reading page →</Link>
      </nav>

      <p className="lede">
        Talk like a grandchild is listening. We save the session, write a chapter from
        your words, extract people and places, then propose links into a family tree —
        demo match: <strong>Pepa from Kladno, born 1948</strong>.
      </p>

      <div className="row">
        <span className={`pill ${status?.llmProvider ? "ok" : "warn"}`}>
          LLM: {status?.llmProvider ?? "heuristic (no API key)"}
        </span>
        <span className={`pill ${status?.voiceAvailable ? "ok" : "warn"}`}>
          Voice: {status?.voiceAvailable ? "key present" : "not configured"}
        </span>
        <span className="pill">
          Sessions: {store?.sessions.filter((s) => s.endedAt).length ?? 0} ended
        </span>
      </div>

      <section className="panel">
        <h2>1. Conversation</h2>
        <div className="actions" style={{ marginBottom: "0.8rem" }}>
          <button className="btn" disabled={busy || !!active} onClick={() => sessionAction("start")}>
            Start session
          </button>
          <button
            className="btn secondary"
            disabled={busy || !active}
            onClick={() => sessionAction("end")}
          >
            End session (save memory)
          </button>
          <button className="btn ghost" disabled={busy} onClick={() => setText(SAMPLE)}>
            Fill sample story
          </button>
          <button className="btn secondary" disabled={busy} onClick={tryVoice}>
            Talk (voice)
          </button>
          <button className="btn danger" disabled={busy} onClick={() => sessionAction("reset")}>
            Reset demo
          </button>
        </div>
        {voiceMsg && <p className="hint">{voiceMsg}</p>}
        {error && (
          <p className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="messages">
          {(active?.messages ?? []).map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
              {m.content}
            </div>
          ))}
          {!active && (
            <p className="hint">
              Start a session. After you end it, start a second one to show memory across
              sessions.
            </p>
          )}
        </div>

        <div className="composer">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your story in English…"
            disabled={!active || busy}
          />
          <div className="actions">
            <button className="btn" disabled={!active || busy || !text.trim()} onClick={send}>
              Send — AI will ask a follow-up
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>2. Chapter + entities + tree match</h2>
        <div className="actions" style={{ marginBottom: "0.8rem" }}>
          <button className="btn" disabled={busy} onClick={processStory}>
            Generate chapter & extract
          </button>
          <a className="btn secondary" href="/api/match" style={{ textDecoration: "none" }}>
            Download GEDCOM
          </a>
        </div>

        <div className="grid2">
          <div>
            <h3 className="meta">Chapter</h3>
            {store?.chapter ? (
              <>
                <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>
                  {store.chapter.title}
                </h3>
                <div className="chapter">{store.chapter.body}</div>
              </>
            ) : (
              <p className="hint">No chapter yet.</p>
            )}
          </div>
          <div>
            <h3 className="meta">Extracted</h3>
            {(store?.entities ?? []).length === 0 && (
              <p className="hint">People, places, and years appear here.</p>
            )}
            {(store?.entities ?? []).map((e) => (
              <div key={e.id} className="entity">
                <strong>
                  {e.kind}: {e.name}
                </strong>
                <div className="meta">
                  {[e.place, e.year].filter(Boolean).join(" · ") || e.notes}
                </div>
              </div>
            ))}

            <h3 className="meta" style={{ marginTop: "1rem" }}>
              Proposed tree links (confirm manually)
            </h3>
            {(store?.matches ?? []).length === 0 && (
              <p className="hint">
                Mention Pepa, Kladno, and 1948 to see a scored match against the fake
                tree.
              </p>
            )}
            {(store?.matches ?? []).map((m) => {
              const ent = store?.entities.find((e) => e.id === m.entityId);
              const person = personById(m.treePersonId);
              return (
                <div key={`${m.entityId}-${m.treePersonId}`} className="match">
                  <strong>
                    {ent?.name} → {person?.givenName} {person?.surname}
                  </strong>
                  <div className="meta">
                    score {m.score} · {m.reasons.join("; ")} · {m.status}
                  </div>
                  {m.status === "proposed" && (
                    <div className="actions" style={{ marginTop: "0.5rem" }}>
                      <button
                        className="btn"
                        disabled={busy}
                        onClick={() => decideMatch(m.entityId, m.treePersonId, "confirmed")}
                      >
                        Confirm
                      </button>
                      <button
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => decideMatch(m.entityId, m.treePersonId, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
