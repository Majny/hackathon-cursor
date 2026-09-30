"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, type HealthResponse, type MemoryResponse, type SnapshotName } from "@/lib/api-client";
import type { Session } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface FirstMsgCheck {
  session: Session;
  firstAi: string | null;
  ok: boolean;
}

const SNAPSHOTS: { name: SnapshotName; label: string }[] = [
  { name: "empty", label: "Načíst: prázdné" },
  { name: "after-s1", label: "Načíst: po povídání 1" },
  { name: "after-s2", label: "Načíst: po povídání 2" },
];

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "/ Povídat (děda)" },
  { href: "/?warm=1", label: "/?warm=1 (pre-warm)" },
  { href: "/?en=1", label: "/?en=1 (EN titulky)" },
  { href: "/rodina", label: "/rodina přehled" },
  { href: "/rodina/kniha", label: "/rodina/kniha" },
  { href: "/rodina/povidani/s1", label: "/rodina/povidani/s1" },
  { href: "/rodina/povidani/s2", label: "/rodina/povidani/s2" },
  { href: "/rodina/lide", label: "/rodina/lide" },
  { href: "/rodina/strom", label: "/rodina/strom" },
  { href: "/api/export/gedcom?includeUnmatched=0", label: "GEDCOM export" },
  { href: "/api/health", label: "/api/health (JSON)" },
  { href: "/api/memory", label: "/api/memory (JSON)" },
];

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return <Badge tone={ok ? "moss" : "warn"}>{ok ? "✓" : "✗"} {label}</Badge>;
}

export default function DemoPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);
  const [memory, setMemory] = useState<MemoryResponse | null>(null);
  const [checks, setChecks] = useState<FirstMsgCheck[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);

  const addLog = (line: string) =>
    setLog((l) => [`${new Date().toLocaleTimeString("cs-CZ")} ${line}`, ...l].slice(0, 30));

  const refresh = useCallback(async () => {
    api.health().then((h) => { setHealth(h); setHealthErr(null); }).catch((e: Error) => setHealthErr(e.message));
    api.memory().then(setMemory).catch((e: Error) => addLog(`Paměť: chyba – ${e.message}`));
    try {
      const sessions = await api.listSessions();
      const res = await Promise.all(
        sessions.map(async (s) => {
          const d = await api.getSession(s.id);
          const firstAi = [...d.turns].sort((a, b) => a.idx - b.idx).find((t) => t.role === "ai")?.text ?? null;
          return { session: s, firstAi, ok: firstAi !== null && firstAi.trim() === s.firstMessage.trim() };
        }),
      );
      setChecks(res);
    } catch (e) {
      addLog(`Sessions: chyba – ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    const t0 = performance.now();
    try {
      const r = await fn();
      addLog(`${label}: OK (${Math.round(performance.now() - t0)} ms) ${summarize(r)}`);
    } catch (e) {
      addLog(`${label}: CHYBA – ${(e as Error).message}`);
    } finally {
      setBusy(null);
      await refresh();
    }
  }

  async function finalizeLast() {
    const sessions = await api.listSessions();
    const last = [...sessions].sort((a, b) => b.index - a.index)[0];
    if (!last) throw new Error("žádná session");
    return api.finalize(last.id);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold">Demo panel</h1>
        <Button variant="secondary" onClick={() => void refresh()}>Obnovit</Button>
      </header>

      <Card>
        <CardTitle>Stav (/api/health)</CardTitle>
        {healthErr && <p className="text-red-700">Chyba: {healthErr}</p>}
        {health ? (
          <div className="flex flex-wrap gap-2">
            <Flag ok={health.openai} label="OpenAI" />
            <Flag ok={health.gemini} label="Gemini" />
            <Flag ok={health.elevenlabs} label="ElevenLabs" />
            <Flag ok={health.supabase} label="Supabase" />
            <Badge>store: {health.store}</Badge>
            <Badge>stateId: {health.stateId}</Badge>
            <Badge tone={health.mockAi ? "warn" : "neutral"}>MOCK_AI: {health.mockAi ? "ano" : "ne"}</Badge>
            <Badge>LLM: {health.llmProvider}</Badge>
            <Badge>{health.models.openai} / {health.models.openaiWriter} / {health.models.gemini}</Badge>
          </div>
        ) : !healthErr && <p className="text-ink-soft">Načítám…</p>}
      </Card>

      <Card>
        <CardTitle>Ovládání</CardTitle>
        <div className="flex flex-wrap gap-3">
          {SNAPSHOTS.map((s) => (
            <Button key={s.name} variant="secondary" disabled={!!busy} onClick={() => run(s.label, () => api.loadDemo(s.name))}>
              {s.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button disabled={!!busy} onClick={() => run("Finalize poslední session", finalizeLast)}>
            Finalize poslední session
          </Button>
          <Button disabled={!!busy} onClick={() => run("Vygenerovat kapitolu Dětství", () => api.generateChapter("detstvi"))}>
            Vygenerovat kapitolu Dětství
          </Button>
          <Button variant="ghost" disabled={!!busy} onClick={() => run("Přepočítat shody", () => api.recomputeMatches())}>
            Přepočítat shody
          </Button>
        </div>
        {busy && <p className="mt-3 text-ink-soft">Probíhá: {busy}…</p>}
        {log.length > 0 && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-paper-dark p-3 text-sm whitespace-pre-wrap">{log.join("\n")}</pre>
        )}
      </Card>

      <Card>
        <CardTitle>Kontrola paměti: první věta agenta == firstMessage</CardTitle>
        {checks.length === 0 && <p className="text-ink-soft">Zatím žádná povídání.</p>}
        <ul className="space-y-3">
          {checks.map((c) => (
            <li key={c.session.id} className="rounded-lg border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{c.session.id}</strong>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${
                    c.ok ? "border-green-600 bg-green-100 text-green-800" : "border-red-500 bg-red-100 text-red-800"
                  }`}
                >
                  {c.ok ? "✓ shoda" : c.firstAi === null ? "✗ žádná AI replika" : "✗ neshoda – injekce proměnných selhala?"}
                </span>
                <Badge>{c.session.status}</Badge>
                <Badge>{c.session.mode}</Badge>
                {c.session.continuedThreadId && <Badge tone="brick">navázáno na: {c.session.continuedThreadId}</Badge>}
              </div>
              <p className="mt-2 text-sm"><span className="text-ink-soft">firstMessage:</span> {c.session.firstMessage}</p>
              {!c.ok && c.firstAi && <p className="mt-1 text-sm"><span className="text-ink-soft">agent řekl:</span> {c.firstAi}</p>}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Co si AI pamatuje (MemoryContext pro další session)</CardTitle>
        {memory ? (
          <div className="space-y-4">
            <p><span className="text-ink-soft">Příští první věta:</span> <strong>{memory.memory.firstMessage}</strong></p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="mb-1 font-semibold">MemoryContext</h3>
                <pre className="max-h-96 overflow-auto rounded-lg bg-paper-dark p-3 text-xs whitespace-pre-wrap">{JSON.stringify(memory.memory, null, 2)}</pre>
              </div>
              <div>
                <h3 className="mb-1 font-semibold">dynamicVariables (ElevenLabs)</h3>
                <pre className="max-h-96 overflow-auto rounded-lg bg-paper-dark p-3 text-xs whitespace-pre-wrap">{JSON.stringify(memory.dynamicVariables, null, 2)}</pre>
              </div>
            </div>
            <Button variant="ghost" onClick={() => setShowPrompt((v) => !v)}>
              {showPrompt ? "Skrýt system prompt" : "Zobrazit system prompt"}
            </Button>
            {showPrompt && (
              <pre className="max-h-96 overflow-auto rounded-lg bg-paper-dark p-3 text-xs whitespace-pre-wrap">{memory.systemPrompt}</pre>
            )}
          </div>
        ) : <p className="text-ink-soft">Načítám…</p>}
      </Card>

      <Card>
        <CardTitle>Stránky</CardTitle>
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-brick underline" target={l.href.startsWith("/api") ? "_blank" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}

function summarize(r: unknown): string {
  if (!r || typeof r !== "object") return "";
  const o = r as Record<string, unknown>;
  if ("title" in o && typeof o.title === "string") return `„${o.title}“`;
  if ("nextTopic" in o && typeof o.nextTopic === "string") return `příště: ${o.nextTopic}`;
  if (Array.isArray(r)) return `${r.length} položek`;
  return "";
}
