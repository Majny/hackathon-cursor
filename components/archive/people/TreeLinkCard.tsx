"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { TreeLinkStatus } from "@/lib/archive";
import type { Match, TreePerson } from "@/lib/types";

const display = "font-(family-name:--font-display)";
const focusRing = "focus-visible:outline-3 focus-visible:outline-brick focus-visible:outline-offset-2";

const GATE_LABELS: Record<string, string> = {
  "surname-mismatch-cap": "Different surname, so we capped the score at 50%",
  "year-gap-cap": "Birth years differ by more than 10, so we capped the score at 50%",
  "no-surname-cap": "Grandpa never said a surname, so we capped the score at 90%",
};

const pct = (n: number | null | undefined) => (n == null ? "–" : `${Math.round(n * 100)}%`);

function tpName(tp: TreePerson) {
  return `${tp.givenName} ${tp.surname}`;
}
function tpMeta(tp: TreePerson) {
  return [
    tp.birthYear ? `b. ${tp.birthYear}${tp.birthPlace ? ` ${tp.birthPlace}` : ""}` : tp.birthPlace,
    tp.deathYear ? `d. ${tp.deathYear}` : null,
    tp.occupation,
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface TreeLinkCardProps {
  name: string;
  status: TreeLinkStatus;
  match: Match | null;
  treePerson: TreePerson | null;
  alsoConsidered: { treePerson: TreePerson | null; score: number; why: string }[];
  inferredReason: string | null;
  relatives: string;
  treeHref: string | null;
}

export function TreeLinkCard({ name, status, match, treePerson, alsoConsidered, inferredReason, relatives, treeHref }: TreeLinkCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "confirm" | "reject">(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "confirm" | "reject">(null);

  const act = async (action: "confirm" | "reject") => {
    if (!match) return;
    setBusy(action);
    setError(null);
    try {
      await api.matchAction(match.id, action);
      setDone(action);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t save that. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const pronoun = "this match";

  const tpLabel = treePerson ? `${tpName(treePerson)}${treePerson.birthYear ? ` (born ${treePerson.birthYear})` : ""}` : "";
  const asking = !!match && match.status === "suggested" && done == null;

  return (
    <section
      aria-labelledby="tree-link-h"
      className={`rounded-2xl border p-5 text-lg sm:p-6 ${asking ? "border-2 border-warn bg-warn-soft/50" : "border-line bg-card"}`}
    >
      <h2 id="tree-link-h" className="sr-only">
        Family tree
      </h2>

      {status === "none" || !treePerson ? (
        <p>
          {name} isn’t in your family tree yet. We can ask Grandpa for a surname or birth year on the next call.
        </p>
      ) : asking ? (
        <p className="text-[1.25rem] leading-snug text-ink">
          Is this the same person as <strong>{tpLabel}</strong> in your family tree?
        </p>
      ) : (
        <p>
          In your family tree as <strong>{tpLabel}</strong>
          {status === "confirmed" ? ", confirmed by the family." : "."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {asking && (
          <>
            <button
              type="button"
              onClick={() => act("confirm")}
              disabled={!!busy}
              className={`min-h-12 rounded-xl bg-moss px-6 text-lg font-medium text-white hover:brightness-95 disabled:opacity-50 ${focusRing}`}
            >
              {busy === "confirm" ? "Saving…" : "Yes"}
            </button>
            <button
              type="button"
              onClick={() => act("reject")}
              disabled={!!busy}
              className={`min-h-12 rounded-xl border border-line bg-card px-6 text-lg font-medium text-ink hover:bg-paper-dark disabled:opacity-50 ${focusRing}`}
            >
              {busy === "reject" ? "Saving…" : "No"}
            </button>
          </>
        )}
        {done === "confirm" && <span className="font-medium text-moss">Thank you, saved to the family tree.</span>}
        {done === "reject" && <span className="font-medium text-ink-soft">Got it. We won’t suggest {pronoun} again.</span>}
        {treeHref && (
          <Link href={treeHref} className={`inline-flex min-h-11 items-center text-brick underline-offset-4 hover:underline ${focusRing}`}>
            See in the family tree
          </Link>
        )}
      </div>

      {treePerson && (match || inferredReason || alsoConsidered.length > 0) && (
        <details className="mt-4 text-base">
          <summary className={`min-h-11 cursor-pointer py-2 text-ink-soft ${focusRing}`}>Why we think so</summary>
          <div className="space-y-3 pb-1 pt-2">
            {tpMeta(treePerson) && <p className="text-ink-soft">In the tree: {tpMeta(treePerson)}</p>}
            {relatives && <p className="text-ink-soft">{relatives}</p>}
            {status === "inferred" && inferredReason && (
              <p className="text-ink-soft">Linked through the family: {inferredReason}. Grandpa named the relationship himself.</p>
            )}
            {match && (
              <>
                <p>{match.reason}</p>
                <p className="text-ink-soft">
                  {match.band === "strong" ? "Strong match" : "Possible match"}: <span className="tabular-nums">{pct(match.score)}</span>
                </p>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      ["First name", match.breakdown.given],
                      ["Surname", match.breakdown.surname],
                      ["Birth year", match.breakdown.year],
                      ["Place", match.breakdown.place],
                    ] as const
                  ).map(([label, v]) => (
                    <div key={label} className="rounded-lg bg-paper px-3 py-2">
                      <dt className="text-sm text-ink-soft">{label}</dt>
                      <dd className="tabular-nums">{v == null ? "not said" : pct(v)}</dd>
                    </div>
                  ))}
                </dl>
                {match.gates.length > 0 && (
                  <ul className="space-y-1 text-ink-soft">
                    {match.gates.map((g) => (
                      <li key={g}>{GATE_LABELS[g] ?? g}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {alsoConsidered.length > 0 && (
              <div>
                <p className="text-ink-soft">Others we considered:</p>
                <ul className="mt-1 space-y-1">
                  {alsoConsidered.map((a, i) => (
                    <li key={a.treePerson?.id ?? i} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {a.treePerson ? tpName(a.treePerson) : null} {a.why && <span className="text-ink-soft">({a.why})</span>}
                      </span>
                      <span className="tabular-nums text-ink-soft">{pct(a.score)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}
      {error && (
        <p role="alert" className="mt-3 text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
