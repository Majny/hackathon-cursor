import type { HTMLAttributes } from "react";

type Tone = "neutral" | "brick" | "moss" | "warn";
const tones: Record<Tone, string> = {
  neutral: "bg-paper-dark text-ink-soft border-line",
  brick: "bg-brick/10 text-brick-dark border-brick/30",
  moss: "bg-moss/10 text-moss border-moss/30",
  warn: "bg-warn-soft text-ink border-warn",
};

export function Badge({ tone = "neutral", className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
