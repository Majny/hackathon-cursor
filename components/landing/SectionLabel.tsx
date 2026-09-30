/** Small uppercase section label. `num` is accepted for compatibility but no longer rendered. */
export function SectionLabel({ children, dark = false }: { num?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.14em] ${dark ? "text-warn" : "text-brick"}`}>
      {children}
    </div>
  );
}
