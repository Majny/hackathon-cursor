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

      <aside className="rounded-2xl border border-line bg-card p-5 lg:w-80 lg:shrink-0">
        {!person ? (
          <p className="text-ink-soft">Click on someone in the tree.</p>
        ) : (
          <>
            <h2 className="text-2xl font-semibold">
              {person.givenName} {person.surname}
            </h2>
            {person.birthSurname && person.birthSurname !== person.surname && (
              <p className="text-ink-soft">née {person.birthSurname}</p>
            )}
            <p className="mt-1">
              {person.birthYear ? `*${person.birthYear}` : ""}
              {person.birthPlace ? `, ${person.birthPlace}` : ""}
              {person.deathYear ? ` · †${person.deathYear}` : ""}
            </p>
            {person.occupation && <p className="text-ink-soft">{person.occupation}</p>}
            {relatives[person.id] && <p className="mt-2 text-sm text-ink-soft">{relatives[person.id]}</p>}

            {story ? (
              <div className="mt-4 border-t border-line pt-4">
                <div className="mb-2 inline-block rounded-full bg-moss px-3 py-0.5 text-sm font-medium text-white">
                  From the memories: “{story.entity.mentionName}”
                </div>
                <p className="text-ink-soft">{story.entity.relationToGrandparent}</p>
                {story.entity.notes && <p className="mt-1">{story.entity.notes}</p>}
                <div className="mt-3 space-y-3">
                  {story.citations.map((c) => (
                    <blockquote key={c.turnId} className="border-l-4 border-brick/40 pl-3 font-serif italic">
                      “{c.quote}”
                      <div>
                        <Link className="text-sm not-italic text-brick underline" href={`/family/sessions/${c.turnId.split("-")[0]}#${c.turnId}`}>
                          {c.turnId}
                        </Link>
                      </div>
                    </blockquote>
                  ))}
                </div>
              </div>
            ) : suggestedTreeIds.includes(person.id) ? (
              <p className="mt-4 text-ink-soft">
                Grandpa may have mentioned them.{" "}
                <Link href="/family/people" className="text-brick underline">Confirm the match</Link>
              </p>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
