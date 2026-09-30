"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { routes } from "@/lib/archive";

type NavItem = { href: string; label: string; exact?: boolean; aliases?: string[]; download?: boolean };

/** The four main places a family member goes. */
export const NAV_ITEMS: NavItem[] = [
  { href: routes.overview(), label: "Home", exact: true },
  { href: routes.stories(), label: "Stories", aliases: ["/family/book"] },
  { href: routes.people(), label: "People" },
  { href: routes.conversations(), label: "Calls", aliases: ["/family/sessions"] },
  { href: routes.tree(), label: "Family tree" },
];

/** Less-used pages, tucked into a small "More" menu. */
export const MORE_ITEMS: NavItem[] = [
  { href: routes.timeline(), label: "Timeline" },
  { href: routes.places(), label: "Places" },
  { href: routes.gedcom(), label: "Download for MyHeritage (GEDCOM)", download: true },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.download) return false;
  if (item.exact) return pathname === item.href || pathname === `${item.href}/`;
  return [item.href, ...(item.aliases ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";

function MoreMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeInMore = MORE_ITEMS.some((i) => isActive(pathname, i));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-[1.05rem] whitespace-nowrap transition-colors ${FOCUS} ${
          activeInMore ? "bg-ink font-medium text-paper" : "text-ink-soft hover:bg-paper-dark hover:text-ink"
        }`}
      >
        More <span aria-hidden className="text-[0.8em]">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <ul className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-card p-2 shadow-lg">
          {MORE_ITEMS.map((item) => (
            <li key={item.href}>
              {item.download ? (
                <a href={item.href} className={`flex min-h-11 items-center rounded-xl px-3 text-[1.05rem] text-ink hover:bg-paper-dark ${FOCUS}`}>
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item) ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-xl px-3 text-[1.05rem] hover:bg-paper-dark ${FOCUS} ${
                    isActive(pathname, item) ? "font-medium text-ink" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Top-level archive navigation: 4 main items + a small "More" menu. */
export function FamilyNav({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Family archive" className={`flex flex-wrap items-center gap-1 ${className}`}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[1.05rem] whitespace-nowrap transition-colors ${FOCUS} ${
              active ? "bg-ink font-medium text-paper" : "text-ink-soft hover:bg-paper-dark hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <MoreMenu pathname={pathname} />
    </nav>
  );
}
