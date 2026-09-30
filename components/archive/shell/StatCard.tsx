import Link from "next/link";

/** Kept for existing imports. Renders the number as-is (no animation). */
export function CountUp({ value }: { value: number; duration?: number }) {
  return <span className="tabular-nums">{value}</span>;
}

/** One plain stat: number + label. Whole tile is a link. */
export function StatCard({
  value,
  suffix,
  label,
  hint,
  href,
}: {
  value: number;
  suffix?: string;
  label: string;
  hint?: string;
  href: string;
  tone?: "ink" | "moss" | "brick";
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 flex-col rounded-2xl border border-line bg-card p-4 transition-colors hover:border-brick/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick"
    >
      <span className="font-(family-name:--font-display) text-[2rem] leading-none text-ink tabular-nums">
        {value}
        {suffix && <span className="text-[1.1rem] text-ink-soft">{suffix}</span>}
      </span>
      <span className="mt-2 text-sm text-ink">{label}</span>
      {hint && <span className="text-sm text-ink-soft">{hint}</span>}
    </Link>
  );
}
