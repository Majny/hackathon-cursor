import { getDb } from "@/lib/store";
import { getTimeline } from "@/lib/archive";
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
    <main className="mx-auto max-w-3xl">
      <header className="pb-6 pt-2">
        <h1 className="font-(family-name:--font-display) text-[2.2rem] leading-tight text-ink sm:text-[2.6rem]">Timeline</h1>
        <p className="mt-2 max-w-[60ch] text-ink-soft">
          {name}, born {t.birthYear} in {gp?.birthPlace ?? "Kladno"}. {told} moments from his calls, dates from the family tree, and{" "}
          {calls} call{calls === 1 ? "" : "s"} with {grandchild}.
        </p>
      </header>
      <LifeTimeline t={t} grandchild={grandchild} />
    </main>
  );
}
