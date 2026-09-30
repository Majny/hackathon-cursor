import { getDb } from "@/lib/store";
import { getTimeline } from "@/lib/archive";
import { LifeTimeline } from "@/components/archive/timeline/LifeTimeline";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const db = await getDb();
  const t = getTimeline(db);
  const name = db.grandparent?.displayName || "Grandpa";

  return (
    <main className="mx-auto max-w-3xl text-[18px]">
      <header className="pb-8 pt-2">
        <h1 className="font-(family-name:--font-display) text-[2.4rem] leading-tight text-ink sm:text-[2.8rem]">Timeline</h1>
        <p className="mt-3 max-w-[55ch] text-[1.2rem] leading-[1.6] text-ink-soft">
          {name}’s life year by year, from his birth in {t.birthYear} until today.
        </p>
      </header>
      <LifeTimeline t={t} grandchild={db.grandparent?.grandchildName || "Tom"} />
    </main>
  );
}
