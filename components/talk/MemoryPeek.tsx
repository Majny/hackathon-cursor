import type { MemoryContext } from "@/lib/types";

export function MemoryPeek({ memory }: { memory: MemoryContext | null }) {
  if (!memory) return null;
  const rows: [string, string][] = [
    ["Co už víme", memory.memorySummary],
    ["Lidé", memory.knownPeople],
    ["Nedovyprávěné příběhy", memory.openThreads],
    ["Dnes navážu na", memory.nextTopic],
    ["Úvodní věta", memory.firstMessage],
  ];
  return (
    <details className="w-full rounded-2xl border border-line bg-card p-5 text-left">
      <summary className="cursor-pointer text-xl font-medium text-ink">
        Co si z minula pamatuju <span className="text-base text-ink-soft">/ What the AI remembers</span>
      </summary>
      <dl className="mt-4 space-y-3">
        <div className="text-sm text-ink-soft">Povídání číslo {memory.sessionNo}</div>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{k}</dt>
            <dd className="whitespace-pre-line text-lg text-ink">{v || "Žádné."}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
