import Link from "next/link";
import { FamilyNav } from "@/components/book/FamilyNav";

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-baseline gap-4">
            <Link href="/" className="group flex items-baseline gap-1.5" aria-label="Heirloom home">
              <span className="text-brick transition-transform group-hover:-rotate-12" aria-hidden>❦</span>
              <span className="font-serif text-2xl font-semibold tracking-tight text-ink">Heirloom</span>
            </Link>
            <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
            <Link href="/family" className="hidden items-baseline gap-2 sm:flex">
              <span className="font-serif text-lg text-ink-soft hover:text-ink">The Novák family book</span>
            </Link>
          </div>
          <FamilyNav />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
