import { getDb } from "@/lib/store";
import { getTimeline } from "@/lib/archive";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { LifeTimeline } from "@/components/archive/timeline/LifeTimeline";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  const db = await getDb();
  const t = getTimeline(db);
  const gp = db.grandparent;
  const name = gp?.displayName || "Grandpa";
  const grandchild = gp?.grandchildName || "Tom";
  const told = t.items.filter((i) => i.kind === "event" || i.kind === "birth").length + t.undated.filter((i) => i.kind === "event").length;
  const calls = t.items.filter((i) => i.kind === "call").length;

  return (
    <main className="mx-auto max-w-4xl">
      <header className="pb-10 pt-2">
        <SectionLabel num="02">Life timeline</SectionLabel>
        <h1 className="font-(family-name:--font-display) text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl">
          {t.nowYear - t.birthYear} years, <em className="italic text-brick">one life</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.15rem] leading-[1.7] text-ink-soft">
          {name}’s life from {t.birthYear} in {gp?.birthPlace ?? "Kladno"} to today: {told} moments in his own words,
          dates from the family tree, and the {calls} call{calls === 1 ? "" : "s"} with {grandchild} where he told them.
        </p>
      </header>
      <LifeTimeline t={t} grandchild={grandchild} />
    </main>
  );
}
