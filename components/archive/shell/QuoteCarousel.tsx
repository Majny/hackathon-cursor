import Link from "next/link";
import type { QuoteRef } from "@/lib/archive";

/** One pull-quote with its source. Static: no auto-rotation. Name kept for existing imports. */
export function QuoteCarousel({ quotes }: { quotes: QuoteRef[]; interval?: number }) {
  const q = quotes[0];
  if (!q) return null;
  return (
    <figure>
      <blockquote className="max-w-[50ch] font-(family-name:--font-display) text-[1.4rem] leading-snug text-ink italic">
        “{q.quote}”
      </blockquote>
      <figcaption className="mt-3 text-sm text-ink-soft">
        {q.speaker} · {q.source} ·{" "}
        <Link href={q.href} className="font-medium text-brick underline-offset-4 hover:underline">
          Open in transcript
        </Link>
      </figcaption>
    </figure>
  );
}
