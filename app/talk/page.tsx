// Senior "Talk" page (WP1). ?warm=1 connects immediately (pre-warm for the pitch).
import Link from "next/link";
import { Talk } from "@/components/talk/Talk";
import CallButton from "@/components/phone/CallButton";

export const dynamic = "force-dynamic";

export default async function TalkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const warm = sp.warm === "1";
  return (
    <>
      <Talk warm={warm} />
      {/* The orchestrator mounts the phone CallButton here. */}
      <div id="phone-call-slot" className="mx-auto flex max-w-3xl justify-center px-5 pb-6">
        <CallButton />
      </div>
      <nav className="mx-auto flex max-w-3xl items-center justify-center gap-6 px-5 pb-10 text-base text-ink-soft">
        <Link href="/" className="font-serif text-lg font-semibold text-ink hover:text-brick">Heirloom</Link>
        <span aria-hidden>·</span>
        <Link href="/family" className="underline underline-offset-4 hover:text-brick">For the family</Link>
        <Link href="/demo" className="underline underline-offset-4 hover:text-brick">Demo</Link>
      </nav>
    </>
  );
}
