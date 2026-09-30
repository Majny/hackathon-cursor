"use client";

import Link from "next/link";
import { useState } from "react";
import type { Citation, FamilyTree as Tree, PersonEntity } from "@/lib/types";
import type { TreeLayout } from "@/lib/treeLayout";
import { PersonCard } from "./PersonCard";

export interface FamilyTreeProps {
  tree: Tree;
  layout: TreeLayout;
  confirmedByTreeId: Record<string, { entity: PersonEntity; citations: Citation[] }>;
  suggestedTreeIds: string[];
  grandparentTreeId: string;
  relatives: Record<string, string>;
  initialFocus?: string | null;
}

export function FamilyTree({ tree, layout, confirmedByTreeId, suggestedTreeIds, grandparentTreeId, relatives, initialFocus }: FamilyTreeProps) {
  const firstConfirmed = Object.keys(confirmedByTreeId)[0] ?? null;
  const [selected, setSelected] = useState<string | null>(initialFocus ?? firstConfirmed);
  const byId = new Map(tree.persons.map((p) => [p.id, p]));
  const person = selected ? byId.get(selected) : undefined;
  const story = selected ? confirmedByTreeId[selected] : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="overflow-x-auto rounded-2xl border border-line bg-card p-2 lg:flex-1">
        <div className="relative" style={{ width: layout.width, height: layout.height }}>
          <svg className="absolute inset-0" width={layout.width} height={layout.height} aria-hidden>
            {layout.edges.map((e) => (
              <path
                key={e.id}
                d={e.d}
                fill="none"
                stroke={e.kind === "spouse" ? "var(--color-brick)" : "var(--color-ink-soft)"}
                strokeWidth={e.kind === "spouse" ? 3 : 1.5}
                strokeOpacity={0.7}
              />
            ))}
          </svg>
          {layout.nodes.map((n) => {
            const p = byId.get(n.id);
            if (!p) return null;
            return (
              <div key={n.id} className="absolute" style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
                <PersonCard
                  person={p}
                  highlighted={!!confirmedByTreeId[n.id]}
                  suggested={suggestedTreeIds.includes(n.id)}
                  selected={selected === n.id}
                  isGrandparent={n.id === grandparentTreeId}
                  onClick={() => setSelected(n.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <aside className="rounded-2xl border border-line bg-card p-5 lg:w-72 lg:shrink-0 lg:self-start lg:sticky lg:top-24">
        {!person ? (
          <p className="text-[1.1rem] text-ink-soft">Tap a name in the tree to see who they are.</p>
        ) : (
          <>
            <h2 className="text-2xl font-semibold">
              {person.givenName} {person.surname}
            </h2>
            {person.birthSurname && person.birthSurname !== person.surname && (
              <p className="text-ink-soft">Maiden name: {person.birthSurname}</p>
            )}
            <p className="mt-1">
              {person.birthYear ? `*${person.birthYear}` : ""}
              {person.birthPlace ? `, ${person.birthPlace}` : ""}
              {person.deathYear ? ` · †${person.deathYear}` : ""}
            </p>
            {person.occupation && <p className="text-ink-soft">{person.occupation}</p>}
            

            {story ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 font-semibold text-moss">In Grandpa’s words</p>
                {story.citations.slice(0, 1).map((c) => (
                  <blockquote key={c.turnId} className="border-l-4 border-brick/40 pl-3 font-serif text-[1.1rem] italic">
                    “{c.quote.length > 110 ? c.quote.slice(0, 110).replace(/\s+\S*$/, "") + "…" : c.quote}”
                  </blockquote>
                ))}
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {story.citations[0] && (
                    <Link className="text-brick underline" href={`/family/conversations/${story.citations[0].turnId.split("-")[0]}#${story.citations[0].turnId}`}>
                      Hear it in the call
                    </Link>
                  )}
                  <Link className="text-brick underline" href={`/family/people/${story.entity.id}`}>
                    All about {story.entity.givenName ?? person.givenName}
                  </Link>
                </div>
                {suggestedTreeIds.includes(person.id) && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-ink">
                    Is this the {story.entity.mentionName} Grandpa talks about?{" "}
                    <Link href={`/family/people/${story.entity.id}`} className="font-semibold text-brick underline">Confirm</Link>
                  </p>
                )}
              </div>
            ) : suggestedTreeIds.includes(person.id) ? (
              <p className="mt-4 text-ink-soft">
                Grandpa may have talked about this person.{" "}
                <Link href="/family/people" className="text-brick underline">Is this the same person?</Link>
              </p>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
