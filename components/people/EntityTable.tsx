import Link from "next/link";
import type { ReactNode } from "react";

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string }

export function EntityTable<T>({ title, rows, columns, rowKey, empty }: {
  title: string; rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; empty: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-2xl font-semibold">
        {title} <span className="text-ink-soft">({rows.length})</span>
      </h2>
      {rows.length === 0 ? (
        <p className="text-ink-soft">{empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-card">
          <table className="w-full text-left">
            <thead className="bg-paper-dark text-sm uppercase tracking-wide text-ink-soft">
              <tr>
                {columns.map((c) => (
                  <th key={c.header} className="px-4 py-2 font-semibold">{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={rowKey(r)} className="border-t border-line align-top">
                  {columns.map((c) => (
                    <td key={c.header} className={`px-4 py-2 ${c.className ?? ""}`}>{c.cell(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TurnLinks({ turnIds }: { turnIds: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {turnIds.map((t) => (
        <Link key={t} href={`/family/sessions/${t.split("-")[0]}#${t}`} className="text-sm text-brick underline">
          {t}
        </Link>
      ))}
    </span>
  );
}
