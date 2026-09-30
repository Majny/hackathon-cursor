import type { TreePerson } from "@/lib/types";

export function PersonCard({ person, highlighted, selected, isGrandparent, onClick }: {
  person: TreePerson; highlighted?: boolean; suggested?: boolean; selected?: boolean; isGrandparent?: boolean; onClick?: () => void;
}) {
  const sexCls = highlighted ? "bg-moss/5 border-moss/50" : "bg-paper border-line";
  const ring = selected ? "ring-2 ring-brick" : highlighted ? "ring-2 ring-moss" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-full flex-col items-start justify-center overflow-hidden rounded-xl border px-3 py-1.5 text-left transition-colors hover:border-brick/50 ${sexCls} ${ring}`}
    >
      <span className="w-full truncate text-base font-semibold leading-tight">
        {person.givenName} {person.surname}
      </span>
      <span className="w-full truncate text-sm text-ink-soft">
        {person.birthYear ? `*${person.birthYear}` : ""}
        {person.deathYear ? ` †${person.deathYear}` : ""}
        {person.birthPlace ? ` · ${person.birthPlace}` : ""}
      </span>
      {highlighted && <span className="mt-0.5 rounded-full bg-moss px-2 text-xs font-medium text-white">in the stories</span>}
      {!highlighted && isGrandparent && <span className="mt-0.5 rounded-full bg-brick px-2 text-xs font-medium text-white">Grandpa</span>}
    </button>
  );
}
