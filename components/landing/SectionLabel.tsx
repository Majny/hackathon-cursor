export function SectionLabel({ num, children, dark = false }: { num: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`mb-6 flex items-center gap-3 text-[0.72rem] font-semibold uppercase tracking-[0.22em] ${dark ? "text-warn" : "text-brick"}`}>
      <span className={`font-(family-name:--font-display) text-base normal-case italic tracking-normal ${dark ? "text-paper/60" : "text-ink-soft"}`}>{num}</span>
      <span className={`h-px w-10 ${dark ? "bg-warn/50" : "bg-brick/40"}`} />
      <span>{children}</span>
    </div>
  );
}
