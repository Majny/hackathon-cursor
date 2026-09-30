/** Small static moss dot. Kept for callers; no animation. */
export function PulseDot({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full bg-moss ${className}`} aria-hidden />;
}

/** "Next call: Tom will ask about {topic}". Informational, not a button. */
export function NextCallPill({ topic, grandchild = "Tom" }: { topic: string; grandchild?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-[0.95rem] text-ink">
      <span className="font-medium">Next call:</span>
      <span className="truncate text-ink-soft">
        {grandchild} will ask about <span className="text-ink">{topic}</span>
      </span>
    </span>
  );
}
