// Senior "Talk" page (WP1). ?warm=1 connects immediately (pre-warm for the pitch).
import Link from "next/link";
import { Talk } from "@/components/talk/Talk";

export const dynamic = "force-dynamic";

export default async function TalkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const warm = sp.warm === "1";
  return (
    <>
      <Talk warm={warm} />
      <p className="mx-auto max-w-3xl px-5 pb-6 text-center text-base text-ink-soft">
        In-browser demo of Tom. For real, Tom calls Grandpa on WhatsApp from our backend.
      </p>
      <nav className="mx-auto flex max-w-3xl items-center justify-center gap-6 px-5 pb-10 text-base text-ink-soft">
        <Link href="/" className="font-serif text-lg font-semibold text-ink hover:text-brick">Heirloom</Link>
        <span aria-hidden>·</span>
        <Link href="/family" className="underline underline-offset-4 hover:text-brick">For the family</Link>
        <Link href="/demo" className="underline underline-offset-4 hover:text-brick">Demo</Link>
      </nav>
    </>
  );
}
