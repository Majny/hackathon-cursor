"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/archive";

type NavItem = { href: string; label: string; exact?: boolean; aliases?: string[] };

export const NAV_ITEMS: NavItem[] = [
  { href: routes.overview(), label: "Overview", exact: true },
  { href: routes.timeline(), label: "Timeline" },
  { href: routes.stories(), label: "Stories", aliases: ["/family/book"] },
  { href: routes.people(), label: "People" },
  { href: routes.places(), label: "Places" },
  { href: routes.conversations(), label: "Conversations", aliases: ["/family/sessions"] },
  { href: routes.tree(), label: "Family tree" },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
  return [item.href, ...(item.aliases ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

/** Top-level archive navigation. Text labels only; horizontally scrollable on phones. */
export function FamilyNav({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Family archive" className={`no-scrollbar -mx-1 flex items-center gap-1 overflow-x-auto px-1 ${className}`}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-[0.95rem] whitespace-nowrap transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick ${
              active ? "bg-ink font-medium text-paper" : "text-ink-soft hover:bg-paper-dark hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
