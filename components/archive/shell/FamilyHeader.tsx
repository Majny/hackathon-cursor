import Link from "next/link";
import type { SearchDoc } from "@/lib/archive";
import { routes } from "@/lib/archive";
import { SearchPalette } from "@/components/archive/search/SearchPalette";
import { FamilyNav } from "./FamilyNav";
import { TextSizeToggle } from "./TextSizeToggle";

/** Sticky archive header: brand · nav · search pill · text-size toggle. No call button — calls happen on WhatsApp. */
export function FamilyHeader({ familyName, docs }: { familyName: string; docs: SearchDoc[] }) {
  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex max-w-6xl 2xl:max-w-[88rem] flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 sm:px-8 2xl:flex-nowrap">
        <Link
          href={routes.overview()}
          className="flex min-h-11 shrink-0 items-baseline gap-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick"
          aria-label={`Heirloom, the ${familyName} family archive, overview`}
        >
          <span className="font-(family-name:--font-display) text-[1.45rem] font-semibold tracking-tight text-ink">Heirloom</span>
          <span className="hidden text-[0.95rem] text-ink-soft 2xl:inline">{familyName} family archive</span>
        </Link>
        <div className="order-3 w-full min-w-0 2xl:order-2 2xl:w-auto 2xl:flex-1">
          <FamilyNav />
        </div>
        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 2xl:order-3 2xl:ml-0">
          <SearchPalette docs={docs} />
          <TextSizeToggle />
        </div>
      </div>
    </header>
  );
}
