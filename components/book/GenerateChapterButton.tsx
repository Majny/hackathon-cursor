"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { LifeTopicKey } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export function GenerateChapterButton({ topic, label, regenerate = false }: { topic: LifeTopicKey; label?: string; regenerate?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api.generateChapter(topic);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Nepodařilo se");
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button variant={regenerate ? "ghost" : "secondary"} onClick={run} disabled={busy}>
        {busy ? "Píšu kapitolu…" : label ?? (regenerate ? "Přepsat" : "Napsat kapitolu")}
      </Button>
      {err && <span className="text-sm text-red-700">{err}</span>}
    </span>
  );
}
