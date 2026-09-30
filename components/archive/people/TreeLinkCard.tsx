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

  const pronoun = match?.treePersonId && treePerson?.sex === "F" ? "her" : "him";

  return (
    <section aria-labelledby="tree-link-h" className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="tree-link-h" className="text-base font-semibold text-ink">
          Family tree
        </h2>
        {status === "suggested" && (
          <span className="text-sm text-ink-soft">Needs confirmation</span>
        )}
        {status === "confirmed" && <span className="text-sm text-moss">Confirmed by the family</span>}
      </div>

      {status === "none" || !treePerson ? (
        <div>
          <p className="text-[1.1rem]">Not in the family tree yet.</p>
          <p className="mt-1 text-ink-soft">Tom can ask Grandpa Jarda for a surname or birth year on the next call.</p>
        </div>
      ) : (
        <>
          <p className="text-[1.15rem]">
            {status === "suggested" ? "Probably " : status === "inferred" ? "Linked to " : ""}
            <span className="font-semibold">{tpName(treePerson)}</span>{" "}
            <span className="text-sm text-ink-soft">({treePerson.id})</span>
          </p>
          {tpMeta(treePerson) && <p className="mt-1 text-ink-soft">{tpMeta(treePerson)}</p>}
          {relatives && <p className="mt-0.5 text-[0.92rem] text-ink-soft">{relatives}</p>}

          {status === "inferred" && inferredReason && (
            <p className="mt-3 text-ink-soft">
              Linked through the family: {inferredReason}. Grandpa named the relationship himself, so no confirmation is needed.
            </p>
          )}

          {match && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-ink-soft">
                  {match.band === "strong" ? "Strong match" : "Possible match"}: <strong className="text-ink tabular-nums">{pct(match.score)}</strong>
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
                    <dd className="font-semibold tabular-nums">{v == null ? "not said" : pct(v)}</dd>
                    <div className="mt-1 h-1 rounded-full bg-paper-dark" aria-hidden>
                      <div className="h-1 rounded-full bg-ink-soft/60" style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
              <p className="mt-3 max-w-[65ch]">
                <span className="font-semibold">Why: </span>
                {match.reason}
              </p>
              {match.gates.length > 0 && (
                <ul className="mt-2 space-y-1 text-[0.92rem] text-ink-soft">
                  {match.gates.map((g) => (
                    <li key={g}>{GATE_LABELS[g] ?? g}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {match && match.status === "suggested" && done == null && (
          <>
            <button
              type="button"
              onClick={() => act("confirm")}
              disabled={!!busy}
              className={`min-h-11 rounded-xl bg-moss px-5 font-medium text-white hover:brightness-95 disabled:opacity-50 ${focusRing}`}
            >
              {busy === "confirm" ? "Saving…" : `Yes, that’s ${pronoun}`}
            </button>
            <button
              type="button"
              onClick={() => act("reject")}
              disabled={!!busy}
              className={`min-h-11 rounded-xl border border-line bg-card px-5 font-medium text-ink hover:bg-paper-dark disabled:opacity-50 ${focusRing}`}
            >
              {busy === "reject" ? "Saving…" : `Not ${pronoun}`}
            </button>
          </>
        )}
        {done === "confirm" && <span className="font-medium text-moss">Thank you, saved to the family tree.</span>}
        {done === "reject" && <span className="font-medium text-ink-soft">Got it. We won’t suggest this match again.</span>}
        {treeHref && (
          <Link href={treeHref} className={`inline-flex min-h-11 items-center font-medium text-brick underline-offset-4 hover:underline ${focusRing}`}>
            View in tree
          </Link>
        )}
      </div>

      {alsoConsidered.length > 0 && (
        <details className="mt-4">
          <summary className={`min-h-11 cursor-pointer py-2 text-ink-soft ${focusRing}`}>Also considered ({alsoConsidered.length})</summary>
          <ul className="mb-2 space-y-1.5">
            {alsoConsidered.map((a, i) => (
              <li key={a.treePerson?.id ?? i} className="flex flex-wrap justify-between gap-2 text-[0.95rem]">
                <span>
                  {a.treePerson ? <strong>{tpName(a.treePerson)}</strong> : null} {a.why && <span className="text-ink-soft">({a.why})</span>}
                </span>
                <span className="tabular-nums text-ink-soft">{pct(a.score)}</span>
              </li>
            ))}
          </ul>
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
