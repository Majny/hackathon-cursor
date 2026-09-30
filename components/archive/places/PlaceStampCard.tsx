import Link from "next/link";
import type { PlaceCardVM } from "@/lib/archive";
import { display, focusRing } from "@/components/archive/people/kit";

function yearsText(years: number[]): string {
  if (years.length === 0) return "";
  if (years.length === 1) return String(years[0]);
  return `${years[0]}–${years[years.length - 1]}`;
}

/** One row in the places list. */
export function PlaceStampCard({ place, people }: { place: PlaceCardVM; people: string[] }) {
  const y = yearsText(place.years);
  return (
    <Link
      href={place.href}
      className={`group flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 ${focusRing}`}
    >
      <div className="min-w-0">
        <h2 className={`${display} text-[1.35rem] leading-tight group-hover:text-brick`}>{place.name}</h2>
        <p className="mt-0.5 text-ink-soft">{place.context}</p>
        {people.length > 0 && <p className="mt-0.5 text-sm text-ink-soft">With {people.join(", ")}</p>}
      </div>
      <p className="shrink-0 text-sm tabular-nums text-ink-soft sm:text-right">
        {y && <span className="block text-ink">{y}</span>}
        {place.mentionCount} mentions
        {place.eventCount > 0 ? ` · ${place.eventCount} ${place.eventCount === 1 ? "event" : "events"}` : ""}
      </p>
    </Link>
  );
}
