export type OrbState = "connecting" | "listening" | "speaking" | "thinking" | "idle";

const LABELS: Record<OrbState, string> = {
  connecting: "Connecting…",
  listening: "Listening",
  speaking: "Speaking",
  thinking: "Thinking…",
  idle: "",
};

export function StatusOrb({ state, speakerName }: { state: OrbState; speakerName: string }) {
  if (state === "idle") return null;
  const label = state === "speaking" ? `${speakerName} is speaking` : LABELS[state];
  const color =
    state === "speaking" ? "bg-brick" : state === "listening" ? "bg-moss" : "bg-warn";
  return (
    <div className="flex items-center gap-4" role="status" aria-live="polite">
      <span className="relative flex h-10 w-10">
        {state !== "connecting" && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${color}`} />
        )}
        <span className={`relative inline-flex h-10 w-10 rounded-full ${color}`} />
      </span>
      <span className="text-3xl font-semibold text-ink">{label}</span>
    </div>
  );
}
