import Link from "next/link";
import { FamilyNav } from "@/components/book/FamilyNav";

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <Link href="/rodina" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-semibold text-ink">Rodinná kniha</span>
            <span className="text-base text-ink-soft">Novákovi</span>
          </Link>
          <FamilyNav />
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
