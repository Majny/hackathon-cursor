import type { MemoryContext } from "@/lib/types";

export function MemoryPeek({ memory }: { memory: MemoryContext | null }) {
  if (!memory) return null;
  const rows: [string, string][] = [
    ["What we know so far", memory.memorySummary],
    ["People", memory.knownPeople],
    ["Unfinished stories", memory.openThreads],
    ["Today I'll pick up on", memory.nextTopic],
    ["Opening line", memory.firstMessage],
  ];
  return (
    <details className="w-full rounded-2xl border border-line bg-card p-5 text-left">
      <summary className="cursor-pointer text-xl font-medium text-ink">
        What Tom remembers
      </summary>
      <dl className="mt-4 space-y-3">
        <div className="text-sm text-ink-soft">Conversation no. {memory.sessionNo}</div>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm font-semibold uppercase tracking-wide text-ink-soft">{k}</dt>
            <dd className="whitespace-pre-line text-lg text-ink">{v || "Nothing yet."}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
