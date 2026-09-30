import Link from "next/link";
import type { PlaceCardVM } from "@/lib/archive";
import { display, focusRing } from "@/components/archive/people/kit";

function yearsText(years: number[]): string {
  if (years.length === 0) return "";
  if (years.length === 1) return String(years[0]);
  return `${years[0]}–${years[years.length - 1]}`;
}

/** One row in the places list: name, why it matters, when. */
export function PlaceStampCard({ place, people }: { place: PlaceCardVM; people: string[] }) {
  const y = yearsText(place.years);
  return (
    <Link
      href={place.href}
      className={`group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 ${focusRing}`}
    >
      <div className="min-w-0">
        <h2 className={`${display} text-[1.5rem] leading-tight group-hover:text-brick`}>{place.name}</h2>
        {place.context && <p className="mt-1 text-[1.15rem] leading-[1.5] text-ink-soft">{place.context}</p>}
        {people.length > 0 && <p className="mt-1 text-[1.05rem] text-ink-soft">With {people.join(", ")}</p>}
      </div>
      {y && <p className="shrink-0 text-[1.1rem] tabular-nums text-ink">{y}</p>}
    </Link>
  );
}
