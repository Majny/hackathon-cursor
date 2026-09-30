import Link from "next/link";
import type { PlaceCardVM } from "@/lib/archive";
import { Stamp, cardCls, display, focusRing } from "@/components/archive/people/kit";

function yearsText(years: number[]): string {
  if (years.length === 0) return "";
  if (years.length === 1) return String(years[0]);
  return `${years[0]}–${years[years.length - 1]}`;
}

export function PlaceStampCard({ place, people }: { place: PlaceCardVM; people: string[] }) {
  const y = yearsText(place.years);
  return (
    <Link
      href={place.href}
      className={`${cardCls} group relative flex h-full flex-col items-center gap-4 overflow-hidden text-center transition-[border-color,transform] hover:-translate-y-0.5 hover:border-brick/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${focusRing}`}
    >
      <span aria-hidden className="pointer-events-none absolute -right-6 top-5 rotate-12 select-none text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-brick/30">
        {y || "Heirloom"}
      </span>
      <Stamp name={place.name} sub={y || undefined} />
      <div>
        <h2 className={`${display} text-[1.45rem] leading-tight group-hover:text-brick-dark`}>{place.name}</h2>
        <p className="mx-auto mt-1 max-w-[34ch] text-ink-soft">{place.context}</p>
      </div>
      <div className="mt-auto flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-line pt-3 text-[0.92rem] text-ink-soft">
        <strong className="text-ink">mentioned {place.mentionCount}×</strong>
        {place.eventCount > 0 && <span>· {place.eventCount} {place.eventCount === 1 ? "event" : "events"}</span>}
        {people.length > 0 && <span>· {people.join(", ")}</span>}
      </div>
    </Link>
  );
}
