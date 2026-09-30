"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { routes } from "@/lib/archive";
import type { Citation, Match, PersonEntity, TreePerson } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export interface MatchCardProps {
  match: Match;
  entity: PersonEntity | null;
  treePerson: TreePerson | null;
  relatives: string;
  citations: Citation[];
  alsoNames: Record<string, string>;
}

const GATE_LABELS: Record<string, string> = {
  "surname-mismatch-cap": "Different surname, capped at 50%",
  "year-gap-cap": "Years differ by more than 10, capped at 50%",
  "no-surname-cap": "No surname mentioned, capped at 90%",
};

const pct = (n: number | null) => (n == null ? "–" : `${Math.round(n * 100)}%`);

export function MatchCard({ match, entity, treePerson, relatives, citations, alsoNames }: MatchCardProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "confirm" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: "confirm" | "reject") => {
    setBusy(action);
    setError(null);
    try {
      await api.matchAction(match.id, action);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save that.");
    } finally {
      setBusy(null);
    }
  };

  const entityDesc = entity
    ? [entity.relationToGrandparent, entity.place, entity.birthYear ? `${entity.birthYearApprox ? "c. " : ""}${entity.birthYear}` : null]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Card className={match.status === "rejected" ? "opacity-70" : ""}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        {match.status === "confirmed" && <Badge tone="moss">Confirmed by the family</Badge>}
        {match.status === "rejected" && <Badge>Rejected</Badge>}
        <span>
          {match.band === "strong" ? "Strong match" : "Possible match"}: <strong className="tabular-nums text-ink">{pct(match.score)}</strong>
        </span>
      </div>

      <p className="text-[1.1rem] leading-relaxed">
        {entity ? (
          <Link href={routes.person(entity.id)} className="font-semibold text-brick-dark underline-offset-4 hover:underline">
            {entity.mentionName}
          </Link>
        ) : (
          <strong>{match.entityId}</strong>
        )}{" "}
        from the calls
        {entityDesc && <span className="text-ink-soft"> ({entityDesc})</span>} may be{" "}
        <strong>
          {treePerson ? `${treePerson.givenName} ${treePerson.surname}` : match.treePersonId}
        </strong>
        {treePerson && (
          <span className="text-ink-soft">
            {" "}
            (*{treePerson.birthYear ?? "?"}
            {treePerson.birthPlace ? `, ${treePerson.birthPlace}` : ""})
          </span>
        )}{" "}
        in the tree.
      </p>
      {relatives && <p className="mt-1 text-ink-soft">{relatives}</p>}
      <p className="mt-2 text-ink-soft">{match.reason}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ["First name", match.breakdown.given],
          ["Surname", match.breakdown.surname],
          ["Year", match.breakdown.year],
          ["Place", match.breakdown.place],
        ] as const).map(([label, v]) => (
          <div key={label} className="rounded-lg bg-paper px-3 py-2">
            <div className="text-sm text-ink-soft">{label}</div>
            <div className="font-semibold tabular-nums">{v == null ? "not said" : pct(v)}</div>
            <div className="mt-1 h-1 rounded bg-paper-dark">
              <div className="h-1 rounded bg-ink-soft/60" style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {match.gates.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
          {match.gates.map((g) => (
            <li key={g}>{GATE_LABELS[g] ?? g}</li>
          ))}
        </ul>
      )}

      {match.alsoConsidered.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-ink-soft">Also considered ({match.alsoConsidered.length})</summary>
          <ul className="mt-2 list-disc pl-6 text-ink-soft">
            {match.alsoConsidered.map((a) => (
              <li key={a.treePersonId}>
                {a.why || alsoNames[a.treePersonId]} – {pct(a.score)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {citations.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold text-ink">What Grandpa said</div>
          {citations.map((c) => (
            <blockquote key={c.turnId} className="border-l-2 border-line pl-3">
              “{c.quote}”{" "}
              <Link className="text-sm text-brick underline-offset-4 hover:underline" href={routes.turn(c.turnId.replace(/-t\d+$/, ""), c.turnId)}>
                Open in call
              </Link>
            </blockquote>
          ))}
        </div>
      )}

      {match.status === "suggested" && (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => act("confirm")} disabled={!!busy}>
            {busy === "confirm" ? "Saving…" : "Yes, that’s him"}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => act("reject")} disabled={!!busy}>
            {busy === "reject" ? "Saving…" : "Not him"}
          </Button>
        </div>
      )}
      {match.status === "confirmed" && (
        <p className="mt-4">
          <Link href={routes.tree(match.treePersonId)} className="text-brick underline">
            View in tree
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-red-700">{error}</p>}
    </Card>
  );
}
