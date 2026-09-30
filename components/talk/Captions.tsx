export interface Caption {
  role: "grandparent" | "ai";
  text: string;
}

export function Captions({ items, aiName }: { items: Caption[]; aiName: string }) {
  const last = items.slice(-2);
  if (last.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-5" aria-live="polite">
      {last.map((c, i) => (
        <div
          key={`${items.length - last.length + i}`}
          className={`rounded-2xl border border-line p-5 ${c.role === "ai" ? "bg-card" : "bg-paper-dark"}`}
        >
          <div className="mb-1 text-lg font-medium text-ink-soft">{c.role === "ai" ? aiName : "Ty"}</div>
          <p className="text-[28px] leading-snug text-ink">{c.text}</p>
        </div>
      ))}
    </div>
  );
}
