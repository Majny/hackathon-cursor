import { getDb } from "@/lib/store";
import { getPlaceProfile, getPlaces } from "@/lib/archive";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { EmptyNote, display } from "@/components/archive/people/kit";
import { PlaceStampCard } from "@/components/archive/places/PlaceStampCard";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const db = await getDb();
  const places = getPlaces(db);
  const peopleAt = new Map(places.map((pl) => [pl.id, (getPlaceProfile(db, pl.id)?.people ?? []).map((p) => p.name.replace(/^(mum|dad|sister|brother)\s+/i, ""))]));
  const total = places.reduce((n, p) => n + p.mentionCount, 0);

  return (
    <main>
      <header className="pb-10 pt-2">
        <SectionLabel num="05">Places in his stories</SectionLabel>
        <h1 className={`${display} text-[2.6rem] leading-[1.05] tracking-tight sm:text-[3.3rem]`}>
          Where his life <em className="italic text-brick">happened</em>
        </h1>
        <p className="mt-3 max-w-[60ch] text-[1.1rem] leading-relaxed text-ink-soft">
          {places.length} places, mentioned {total} times across his calls with Tom. Open one to read everything he said about it.
        </p>
      </header>

      {places.length === 0 ? (
        <EmptyNote>Grandpa hasn’t named any places yet. Tom will ask where it all happened.</EmptyNote>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((pl) => (
            <li key={pl.id}>
              <PlaceStampCard place={pl} people={peopleAt.get(pl.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
