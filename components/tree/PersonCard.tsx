import type { TreePerson } from "@/lib/types";

export function PersonCard({ person, highlighted, suggested, selected, isGrandparent, onClick }: {
  person: TreePerson; highlighted?: boolean; suggested?: boolean; selected?: boolean; isGrandparent?: boolean; onClick?: () => void;
}) {
  const sexCls = person.sex === "F" ? "bg-rose-50 border-rose-300" : "bg-sky-50 border-sky-300";
  const ring = selected ? "ring-4 ring-brick" : highlighted ? "ring-4 ring-moss" : suggested ? "ring-2 ring-warn" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-full flex-col items-start justify-center overflow-hidden rounded-xl border-2 px-3 py-1.5 text-left shadow-sm transition-transform hover:-translate-y-0.5 ${sexCls} ${ring}`}
    >
      <span className="w-full truncate text-base font-semibold leading-tight">
        {person.givenName} {person.surname}
      </span>
      <span className="w-full truncate text-sm text-ink-soft">
        {person.birthYear ? `*${person.birthYear}` : ""}
        {person.deathYear ? ` †${person.deathYear}` : ""}
        {person.birthPlace ? ` · ${person.birthPlace}` : ""}
      </span>
      {highlighted && <span className="mt-0.5 rounded-full bg-moss px-2 text-xs font-medium text-white">ze vzpomínek</span>}
      {!highlighted && isGrandparent && <span className="mt-0.5 rounded-full bg-brick px-2 text-xs font-medium text-white">vypravěč</span>}
      {!highlighted && !isGrandparent && suggested && <span className="mt-0.5 rounded-full bg-warn px-2 text-xs font-medium">návrh shody</span>}
    </button>
  );
}
