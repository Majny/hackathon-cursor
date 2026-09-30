// "Grandpa at the centre" radial graph. Pure SVG, server-rendered.
import type { PersonCardVM } from "@/lib/archive";

export function PeopleConstellation({ people, centerLabel, centerInitials }: { people: PersonCardVM[]; centerLabel: string; centerInitials: string }) {
  const W = 560;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const rx = 205;
  const ry = 125;
  const max = Math.max(1, ...people.map((p) => p.mentionCount));
  const n = people.length;
  const nodes = people.map((p, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2 + (n % 2 === 0 ? Math.PI / n : 0);
    return { p, x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
  return (
    <figure className="rounded-2xl border border-line bg-card p-3 sm:p-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full min-w-[420px] max-w-[640px]" role="img" aria-label={`${centerLabel} and the people he talks about`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="var(--color-line)" strokeDasharray="3 6" />
          {nodes.map(({ p, x, y }) => {
            const inTree = p.treeStatus !== "none";
            return (
              <line
                key={`e-${p.id}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={inTree ? "var(--color-brick)" : "var(--color-ink-soft)"}
                strokeOpacity={inTree ? 0.55 : 0.35}
                strokeWidth={1.5 + (p.mentionCount / max) * 7}
                strokeLinecap="round"
                strokeDasharray={inTree ? undefined : "4 6"}
              />
            );
          })}
          <g>
            <circle cx={cx} cy={cy} r={44} fill="var(--color-ink)" />
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="24" fill="var(--color-paper)" style={{ fontFamily: "var(--font-display), serif" }}>
              {centerInitials}
            </text>
            <text x={cx} y={cy + 66} textAnchor="middle" fontSize="14" fill="var(--color-ink)" fontWeight={600}>
              {centerLabel}
            </text>
          </g>
          {nodes.map(({ p, x, y }) => {
            const inTree = p.treeStatus !== "none";
            const r = 24 + (p.mentionCount / max) * 8;
            const below = y >= cy;
            return (
              <a key={p.id} href={p.href} aria-label={`${p.name}, mentioned ${p.mentionCount} times`}>
                <g className="cursor-pointer transition-opacity hover:opacity-80">
                  <circle cx={x} cy={y} r={r} fill={inTree ? "#f6e3d8" : "var(--color-paper-dark)"} stroke={inTree ? "var(--color-brick)" : "var(--color-ink-soft)"} strokeWidth={2} strokeDasharray={inTree ? undefined : "3 4"} />
                  <text x={x} y={y + 6} textAnchor="middle" fontSize="17" fill={inTree ? "var(--color-brick-dark)" : "var(--color-ink-soft)"} style={{ fontFamily: "var(--font-display), serif" }}>
                    {p.initials}
                  </text>
                  <text x={x} y={below ? y + r + 18 : y - r - 22} textAnchor="middle" fontSize="14" fontWeight={600} fill="var(--color-ink)">
                    {p.name}
                  </text>
                  <text x={x} y={below ? y + r + 34 : y - r - 7} textAnchor="middle" fontSize="12" fill="var(--color-ink-soft)">
                    {p.mentionCount}× · {p.relation.length > 26 ? `${p.relation.slice(0, 24)}…` : p.relation}
                  </text>
                </g>
              </a>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 px-2 text-[0.88rem] text-ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-6 rounded bg-brick/60" /> in the family tree
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-6 border-t-2 border-dashed border-ink-soft/60" /> not in the tree yet
        </span>
        <span>thicker line = mentioned more often</span>
      </figcaption>
    </figure>
  );
}
