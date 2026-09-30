import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { getDb } from "@/lib/store";
import { buildSearchIndex, routes, type SearchDoc } from "@/lib/archive";
import { FamilyHeader } from "@/components/archive/shell/FamilyHeader";

const display = Fraunces({ subsets: ["latin", "latin-ext"], style: ["normal", "italic"], variable: "--font-display" });
const body = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Family archive · Heirloom",
  description: "Stories, people, places and a timeline from Grandpa Jerry's calls with Tom.",
};

export const dynamic = "force-dynamic";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  let docs: SearchDoc[] = [];
  let familyName = "Miller";
  try {
    const db = await getDb();
    docs = buildSearchIndex(db);
    familyName = db.grandparent?.fullName?.split(/\s+/).pop() || familyName;
  } catch {
    /* the archive still renders; search is just empty */
  }

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-paper text-[1.125rem] font-(family-name:--font-body) text-ink selection:bg-brick/20`}
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <FamilyHeader familyName={familyName} docs={docs} />
      <div id="main" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        {children}
      </div>
      <footer className="mt-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-ink-soft sm:px-8">
          <p>Heirloom. Stories from Grandpa Jerry&apos;s calls with Tom.</p>
          <div className="flex flex-wrap gap-4">
            <Link href={routes.tree()} className="hover:text-brick">Family tree</Link>
            <a href={routes.gedcom()} className="hover:text-brick">Download for MyHeritage (GEDCOM)</a>
            <Link href="/" className="hover:text-brick">About Heirloom</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
