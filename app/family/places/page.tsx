import { getDb } from "@/lib/store";
import { getPlaceProfile, getPlaces } from "@/lib/archive";
import { EmptyNote, display } from "@/components/archive/people/kit";
import { PlaceStampCard } from "@/components/archive/places/PlaceStampCard";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
  const db = await getDb();
  const places = getPlaces(db);
  const peopleAt = new Map(places.map((pl) => [pl.id, (getPlaceProfile(db, pl.id)?.people ?? []).map((p) => p.name.replace(/^(mum|dad|sister|brother)\s+/i, ""))]));

  return (
    <main className="text-[18px]">
      <header className="pb-6 pt-2">
        <h1 className={`${display} text-[2.4rem] leading-tight sm:text-[2.8rem]`}>Places</h1>
        <p className="mt-3 max-w-[55ch] text-[1.2rem] leading-[1.6] text-ink-soft">
          The towns and places Grandpa talks about. Open one to see what happened there.
        </p>
      </header>

      {places.length === 0 ? (
        <EmptyNote>Grandpa hasn’t named any places yet. Tom will ask where it all happened.</EmptyNote>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
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
