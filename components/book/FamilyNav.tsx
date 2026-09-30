"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/family", label: "Přehled", exact: true },
  { href: "/family/book", label: "Kniha" },
  { href: "/family/people", label: "Lidé" },
  { href: "/family/tree", label: "Strom" },
];

export function FamilyNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-4 py-1.5 text-lg transition-colors ${
              active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-dark hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/talk"
        className="ml-2 rounded-full border border-brick/40 px-4 py-1.5 text-lg font-medium text-brick hover:bg-brick hover:text-white"
      >
        Povídat →
      </Link>
    </nav>
  );
}
