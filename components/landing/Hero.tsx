import Link from "next/link";
import { WhatsAppCall } from "./WhatsAppCall";
import { WhatsAppSoon } from "./WhatsAppSoon";

export const primaryCta =
  "inline-flex min-h-12 items-center rounded-full bg-ink px-6 py-3 text-[0.95rem] font-semibold text-paper transition-colors hover:bg-brick-dark focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
export const secondaryCta =
  "inline-flex min-h-12 items-center rounded-full border border-line bg-card px-6 py-3 text-[0.95rem] font-semibold text-ink transition-colors hover:border-brick/50 hover:text-brick focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-12 md:grid-cols-[1.2fr_1fr] md:pt-20">
      <div>
        <h1 className="font-(family-name:--font-display) text-[2.6rem] leading-[1.05] tracking-[-0.02em] text-ink sm:text-[3.4rem] lg:text-[4rem]">
          Your family&apos;s stories, in their own voice.
        </h1>
        <p className="mt-6 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft">
          Tom, an AI grandson, calls Grandpa Jerry on WhatsApp and turns the calls into a family archive.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/family" className={primaryCta}>
            Open the family archive
          </Link>
          <Link href="/talk" className={secondaryCta}>
            Try Tom in your browser
          </Link>
        </div>
        <WhatsAppSoon />
      </div>
      <WhatsAppCall />
    </section>
  );
}
