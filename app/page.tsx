// Senior "Povídat" page (WP1). ?warm=1 connects immediately (pre-warm for the pitch).
import Link from "next/link";
import { Talk } from "@/components/talk/Talk";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const warm = sp.warm === "1";
  return (
    <>
      <Talk warm={warm} />
      <nav className="mx-auto flex max-w-3xl justify-center gap-6 px-5 pb-8 text-base text-ink-soft">
        <Link href="/rodina" className="underline underline-offset-4 hover:text-brick">Pro rodinu</Link>
        <Link href="/demo" className="underline underline-offset-4 hover:text-brick">Demo</Link>
      </nav>
    </>
  );
}
