import Link from "next/link";
import type { Timeline, TimelineItem } from "@/lib/archive";

// ───────────────────────── helpers (local, pure) ─────────────────────────

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}

type DecadeBlock =
  | { kind: "decade"; decade: number; items: TimelineItem[] }
  | { kind: "gap"; from: number; to: number };

/** Groups dated items by decade; consecutive empty decades collapse into one "quiet" gap. */
export function groupByDecade(items: TimelineItem[], birthYear: number, nowYear: number): DecadeBlock[] {
  const blocks: DecadeBlock[] = [];
  for (let d = decadeOf(birthYear); d <= decadeOf(nowYear); d += 10) {
    const inDecade = items.filter((i) => i.year != null && decadeOf(i.year) === d);
    if (inDecade.length) blocks.push({ kind: "decade", decade: d, items: inDecade });
    else {
      const last = blocks[blocks.length - 1];
      if (last?.kind === "gap") last.to = d;
      else blocks.push({ kind: "gap", from: d, to: d });
    }
  }
  return blocks;
}

const linkCls =
  "inline-flex min-h-11 items-center text-[1.05rem] text-brick underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";

function linkFor(item: TimelineItem): { href: string; label: string } | null {
  if (item.kind === "call" && item.href) return { href: item.href, label: "Read the call" };
  if (item.quotes[0]) return { href: item.quotes[0].href, label: "Hear it in his words" };
  if (item.kind === "tree" && item.href) return { href: item.href, label: "See in the family tree" };
  if (item.href) return { href: item.href, label: "Open" };
  return null;
}

/** One line: year, what happened, one link. */
function Row({ item }: { item: TimelineItem }) {
  const link = linkFor(item);
  return (
    <li id={item.id} className="grid scroll-mt-28 grid-cols-[4.5rem_1fr] gap-x-4 py-4 sm:grid-cols-[6rem_1fr]">
      <span className="pt-0.5 font-(family-name:--font-display) text-[1.3rem] tabular-nums text-ink">
        {item.year ?? "?"}
      </span>
      <div className="min-w-0">
        <p className="text-[1.2rem] leading-[1.5] text-ink">
          {item.title}
          {item.kind === "not-yet-told" && <span className="text-ink-soft"> (Tom will ask about this)</span>}
        </p>
        {link && (
          <Link href={link.href} className={linkCls}>
            {link.label}
          </Link>
        )}
      </div>
    </li>
  );
}

// ───────────────────────── main ─────────────────────────

export function LifeTimeline({ t, grandchild = "Tom" }: { t: Timeline; grandchild?: string }) {
  const blocks = groupByDecade(t.items, t.birthYear, t.nowYear).filter(
    (b): b is Extract<DecadeBlock, { kind: "decade" }> => b.kind === "decade",
  );

  return (
    <div className="space-y-10">
      {blocks.map((b) => (
        <section key={b.decade} id={`decade-${b.decade}`} className="scroll-mt-28" aria-labelledby={`decade-h-${b.decade}`}>
          <h2 id={`decade-h-${b.decade}`} className="border-b border-line pb-2 font-(family-name:--font-display) text-[1.8rem] leading-tight text-ink">
            {b.decade}s
          </h2>
          <ol className="divide-y divide-line/60">
            {b.items.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ol>
        </section>
      ))}

      {t.undated.length > 0 && (
        <section aria-labelledby="undated-h">
          <h2 id="undated-h" className="border-b border-line pb-2 font-(family-name:--font-display) text-[1.8rem] leading-tight text-ink">
            Year not known yet
          </h2>
          <p className="mt-2 text-[1.05rem] text-ink-soft">{grandchild} will ask when these happened.</p>
          <ol className="divide-y divide-line/60">
            {t.undated.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
