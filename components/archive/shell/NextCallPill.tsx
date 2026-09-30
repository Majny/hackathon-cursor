/** Pulsing moss dot + "Next call · Tom will ask about {topic}". Reports the backend engine — not a button. */
export function PulseDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2.5 w-2.5 shrink-0 ${className}`} aria-hidden>
      <span className="pulse-ring absolute inset-0 rounded-full bg-moss" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-moss" />
    </span>
  );
}

export function NextCallPill({ topic, grandchild = "Tom" }: { topic: string; grandchild?: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-moss/35 bg-moss/10 px-4 py-2 text-[0.95rem] text-ink">
      <PulseDot />
      <span className="font-semibold text-moss">Next call</span>
      <span className="text-ink-soft" aria-hidden>·</span>
      <span className="truncate">
        {grandchild} will ask about <span className="font-medium">{topic}</span>
      </span>
    </span>
  );
}
