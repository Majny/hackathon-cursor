"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "calling" | "ringing" | "processing" | "done" | "error";

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

interface StatusResponse {
  config?: { canCall?: boolean };
  transcriptArrived?: boolean;
  finalized?: boolean;
  failed?: boolean;
  turns?: number;
}

/** "Call Grandpa" – places a real phone call from Tom (ElevenLabs agent via Twilio) and follows it until memories are saved. */
export function CallButton({ className = "" }: { className?: string }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/phone/status", { cache: "no-store" })
      .then((r) => r.json() as Promise<StatusResponse>)
      .then((s) => setConfigured(!!s.config?.canCall))
      .catch(() => setConfigured(false));
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const stop = () => { if (timer.current) clearInterval(timer.current); timer.current = null; };

  const poll = (id: string) => {
    stop();
    const startedAt = Date.now();
    timer.current = setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stop();
        setPhase("error");
        setError("We haven't heard back about the call. Check the family page in a bit.");
        return;
      }
      try {
        const s = (await fetch(`/api/phone/status?sessionId=${encodeURIComponent(id)}`, { cache: "no-store" }).then((r) => r.json())) as StatusResponse;
        setTurns(s.turns ?? 0);
        if (s.finalized) {
          setPhase("done");
          stop();
        } else if (s.failed) {
          setPhase("error");
          setError(s.transcriptArrived ? "The call ended, but we couldn't save the memories." : "Grandpa didn't pick up.");
          stop();
        } else if (s.transcriptArrived) {
          setPhase("processing");
        }
      } catch { /* keep polling */ }
    }, POLL_MS);
  };

  const call = async () => {
    setError(null);
    setPhase("calling");
    try {
      const res = await fetch("/api/phone/call", {
        method: "POST",
      });
      const body = (await res.json()) as { sessionId?: string; error?: string };
      if (!res.ok || !body.sessionId) throw new Error(body.error ?? `Call failed (${res.status})`);
      setSessionId(body.sessionId);
      setPhase("ringing");
      poll(body.sessionId);
    } catch (e) {
      setPhase("error");
      setError((e as Error).message);
    }
  };

  const busy = phase === "calling" || phase === "ringing" || phase === "processing";

  return (
    <div className={`flex flex-col items-center gap-3 text-center ${className}`}>
      <button
        type="button"
        onClick={call}
        disabled={!configured || busy}
        className={`inline-flex items-center justify-center gap-3 rounded-2xl bg-brick px-10 py-6 text-3xl font-medium text-white shadow-sm transition-colors hover:bg-brick-dark disabled:cursor-not-allowed disabled:opacity-50 ${phase === "ringing" ? "animate-pulse" : ""}`}
      >
        <span aria-hidden>📞</span>
        {phase === "calling" ? "Dialing…" : phase === "ringing" ? "Ringing…" : phase === "processing" ? "Saving memories…" : "Call Grandpa"}
      </button>

      {configured === false && (
        <p className="text-sm text-ink-soft">Phone calls aren&apos;t configured yet — see docs/PHONE.md.</p>
      )}
      {phase === "ringing" && (
        <p className="text-ink-soft">Tom is calling Grandpa Jerry. The memories appear here when the call ends.</p>
      )}
      {phase === "processing" && (
        <p className="text-ink-soft">Call finished — {turns} lines transcribed. Writing the family book…</p>
      )}
      {phase === "done" && (
        <p className="text-lg text-moss">
          Call finished — memories saved.{" "}
          <Link href={sessionId ? `/family/sessions/${sessionId}` : "/family"} className="underline">
            See what Grandpa told us
          </Link>{" "}
          · <Link href="/family" className="underline">Family overview</Link>
        </p>
      )}
      {phase === "error" && error && (
        <p className="text-sm text-red-700">
          {error}{" "}
          <button type="button" className="underline" onClick={() => { setPhase("idle"); setError(null); }}>
            Try again
          </button>
        </p>
      )}
    </div>
  );
}

export default CallButton;
