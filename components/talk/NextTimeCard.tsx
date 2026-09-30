import Link from "next/link";

export function NextTimeCard({ nextTopic, onRestart }: { nextTopic: string; onRestart?: () => void }) {
  return (
    <div className="w-full rounded-3xl border-2 border-brick bg-card p-8 text-center shadow-sm">
      <p className="text-2xl text-ink-soft">Děkuji, dědo. Vzpomínky jsou zapsané.</p>
      <p className="mt-4 font-serif text-[34px] leading-tight text-ink">
        Příště se zeptám na: <span className="text-brick">{nextTopic}</span>
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/rodina"
          className="rounded-2xl bg-brick px-8 py-4 text-2xl font-medium text-white hover:bg-brick-dark"
        >
          Co vzniklo pro rodinu
        </Link>
        {onRestart && (
          <button onClick={onRestart} className="rounded-2xl border border-line px-6 py-4 text-xl text-ink hover:bg-paper-dark">
            Povídat znovu
          </button>
        )}
      </div>
    </div>
  );
}
