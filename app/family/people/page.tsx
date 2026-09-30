import Link from "next/link";
import { getDb } from "@/lib/store";
import { getPeople, routes, type PersonCardVM } from "@/lib/archive";
import { resolveTree } from "@/lib/treeLayout";
import { RecomputeButton } from "@/components/people/RecomputeButton";
import { Avatar, display, focusRing, EmptyNote } from "@/components/archive/people/kit";

export const dynamic = "force-dynamic";

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const callsLine = (n: number) => (n === 0 ? "Not mentioned in a call yet" : `Mentioned in ${n} ${n === 1 ? "call" : "calls"}`);

export default async function PeoplePage() {
  const db = await getDb();
  const people = getPeople(db);
  const gp = db.grandparent;
  const speaker = gp?.displayName || `Grandpa ${gp?.fullName?.split(/\s+/)[0] ?? ""}`.trim();

  const tree = resolveTree(db.tree);
  const treeById = new Map(tree.persons.map((p) => [p.id, p]));
  const personById = new Map(people.map((p) => [p.id, p]));
  const pending = db.matches
    .filter((m) => m.status === "suggested")
    .sort((a, b) => b.score - a.score)
    .map((m) => ({ m, person: personById.get(m.entityId), tp: treeById.get(m.treePersonId) }))
    .filter((x): x is { m: (typeof x)["m"]; person: PersonCardVM; tp: (typeof x)["tp"] } => !!x.person);

  const family = people.filter((p) => p.group === "family");
  const others = people.filter((p) => p.group !== "family");

  return (
    <main className="mx-auto max-w-[46rem] text-lg">
      <header className="pb-8 pt-2">
        <h1 className={`${display} text-[2.4rem] leading-tight sm:text-[2.8rem]`}>People</h1>
        <p className="mt-3 max-w-[60ch] text-[1.2rem] leading-relaxed text-ink-soft">
          Everyone {speaker} has talked about in his calls. Tap a name to read what he said.
        </p>
      </header>

      {pending.length > 0 && (
        <section aria-labelledby="needs-h" className="mb-10 rounded-2xl border-2 border-warn bg-warn-soft/60 p-5 sm:p-6">
          <h2 id="needs-h" className="text-xl font-semibold text-ink">
            Needs your answer ({pending.length})
          </h2>
          <p className="mt-1 text-ink-soft">We’re not sure if these are the same people as in your family tree. Only you can tell us.</p>
          <ul className="mt-4 space-y-2">
            {pending.map(({ m, person, tp }) => (
              <li key={m.id}>
                <Link
                  href={person.href}
                  className={`flex min-h-12 flex-wrap items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 hover:bg-paper-dark ${focusRing}`}
                >
                  <span>
                    Is <strong>{person.name}</strong> the same person as{" "}
                    <strong>{tp ? `${tp.givenName} ${tp.surname}` : "someone in your tree"}</strong>
                    {tp?.birthYear ? ` (born ${tp.birthYear})` : ""}?
                  </span>
                  <span className="font-medium text-brick">Answer →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {people.length === 0 ? (
        <EmptyNote>No one yet. After the first call, the people {speaker} mentions will appear here.</EmptyNote>
      ) : (
        <div className="space-y-10">
          <PeopleList title="Family" people={family} />
          <PeopleList title="Friends and others" people={others} />
        </div>
      )}

      <details className="mt-14 border-t border-line pt-6 text-base text-ink-soft">
        <summary className={`min-h-11 cursor-pointer py-2 ${focusRing}`}>Details</summary>
        <div className="space-y-3 pt-2">
          <p>
            We compare names, birth years and places from the calls with your family tree. A person is only linked once someone in the family
            says yes.
          </p>
          <RecomputeButton />
          <p>
            <Link href={routes.tree()} className="text-brick underline underline-offset-4">
              Open the family tree
            </Link>
          </p>
        </div>
      </details>
    </main>
  );
}

function PeopleList({ title, people }: { title: string; people: PersonCardVM[] }) {
  if (people.length === 0) return null;
  return (
    <section>
      <h2 className={`${display} mb-3 text-[1.6rem] leading-tight`}>{title}</h2>
      <ul className="divide-y divide-line border-y border-line">
        {people.map((p) => (
          <li key={p.id}>
            <Link href={p.href} className={`group flex min-h-16 items-center gap-4 py-4 hover:bg-card ${focusRing}`}>
              <Avatar initials={p.initials} tone={p.group === "family" ? "brick" : "moss"} size={48} />
              <span className="min-w-0 flex-1">
                <span className="block text-[1.2rem] font-semibold text-ink group-hover:text-brick-dark">{p.name}</span>
                <span className="block text-ink-soft">
                  {capitalize(p.relation)} · {callsLine(p.callsMentioned.length)}
                </span>
              </span>
              {p.treeStatus === "suggested" && (
                <span className="shrink-0 rounded-full bg-warn-soft px-3 py-1 text-base text-ink">Needs your answer</span>
              )}
              <span aria-hidden className="shrink-0 text-ink-soft group-hover:text-brick">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
