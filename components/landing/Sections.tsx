import Link from "next/link";
import { Reveal } from "./Reveal";
import { WhatsAppCall } from "./WhatsAppCall";
import { SectionLabel } from "./SectionLabel";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brick text-paper shadow-inner">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 12h2M8 8v8M12 5v14M16 8v8M20 12h-2" />
            </svg>
          </span>
          <span className="font-(family-name:--font-display) text-[1.35rem] tracking-tight text-ink">Heirloom</span>
        </Link>
        <div className="hidden items-center gap-7 text-[0.85rem] text-ink-soft md:flex">
          <a href="#how" className="transition hover:text-ink">How it works</a>
          <a href="#call" className="transition hover:text-ink">The call</a>
          <Link href="/family/stories" className="transition hover:text-ink">Stories</Link>
          <Link href="/family/conversations" className="transition hover:text-ink">Conversations</Link>
        </div>
        <Link
          href="/family"
          className="rounded-full bg-ink px-4 py-2 text-[0.8rem] font-semibold text-paper transition hover:bg-brick-dark"
        >
          Family archive →
        </Link>
      </nav>
    </header>
  );
}

const PROBLEMS = [
  {
    icon: "🕯️",
    title: "Stories vanish",
    body: "Every grandparent carries decades of history. Most of it is never recorded — and it leaves with them.",
  },
  {
    icon: "✍️",
    title: "Writing is hard",
    body: "Grandpa won’t type a memoir, and nobody has a free weekend to interview him properly. So nobody does.",
  },
  {
    icon: "🗄️",
    title: "Books sit in a drawer",
    body: "Even when a memoir gets written, it’s disconnected from the family tree — names, dates and places stay locked in prose.",
  },
];

export function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <SectionLabel num="01">The problem</SectionLabel>
        <h2 className="font-(family-name:--font-display) max-w-3xl text-[2.4rem] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[3.1rem]">
          When a grandparent goes, <span className="italic text-brick">a library burns.</span>
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {PROBLEMS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.12}>
            <div className="group h-full rounded-[1.5rem] border border-line bg-card p-7 transition duration-300 hover:-translate-y-1.5 hover:border-brick/30 hover:shadow-[0_30px_60px_-35px_rgba(59,42,30,0.55)]">
              <div className="flex items-center justify-between">
                <span className="text-[1.8rem] transition duration-300 group-hover:scale-110">{p.icon}</span>
                <span className="font-(family-name:--font-display) text-[0.95rem] italic text-ink-soft/50">0{i + 1}</span>
              </div>
              <h3 className="font-(family-name:--font-display) mt-6 text-[1.55rem] leading-tight text-ink">{p.title}</h3>
              <p className="mt-3 text-[0.92rem] leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function CallSection() {
  return (
    <section id="call" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] border border-brick/20 bg-[linear-gradient(135deg,#fff3e6_0%,#f6e3cc_55%,#f0d6b8_100%)] p-8 sm:p-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(180,83,42,0.22),transparent_65%)]" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <SectionLabel num="04">The call</SectionLabel>
              <h2 className="font-(family-name:--font-display) text-[2.4rem] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[3rem]">
                Nothing to press. <span className="italic text-brick">Tom calls on WhatsApp.</span>
              </h2>
              <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-ink-soft">
                At the time Grandpa likes, his phone rings. It&apos;s Tom, on the WhatsApp he already uses for the
                grandkids&apos; photos. He picks up, and the story continues exactly where it stopped last time.
              </p>
              <ol className="mt-7 space-y-4">
                {[
                  ["Tom calls", "Our backend places a WhatsApp voice call. No app to install, no link to click."],
                  ["Grandpa talks", "A gentle 10–15 minute chat. Tom remembers every earlier call and asks about the unfinished story."],
                  ["The family reads", "Minutes later the transcript, new stories, people and places appear in the family archive."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="font-(family-name:--font-display) grid h-9 w-9 shrink-0 place-items-center rounded-full border border-brick/30 bg-card text-[1rem] italic text-brick">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-ink">{t}</div>
                      <p className="text-[0.9rem] leading-relaxed text-ink-soft">{b}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/family" className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 py-3 text-[0.92rem] font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-brick-dark">
                  Open the family archive <span className="transition group-hover:translate-x-1">→</span>
                </Link>
                <Link href="/talk" className="inline-flex min-h-12 items-center rounded-full border border-ink/15 bg-card px-6 py-3 text-[0.92rem] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brick/50 hover:text-brick">
                  Try Tom in your browser
                </Link>
              </div>
            </div>
            <div className="py-4">
              <WhatsAppCall />
              <p className="mt-6 text-center text-[0.78rem] text-ink-soft">
                What Grandpa sees. The call is placed automatically by the backend.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const TRUST = [
  { title: "Every sentence is cited", body: "Each line of the book links back to grandpa’s exact words. If he didn’t say it, it isn’t written." },
  { title: "Family approves", body: "Nothing is final until the family reviews, edits and approves each chapter." },
  { title: "Your data stays yours", body: "GDPR-first. Export everything — the book and a standard GEDCOM file — or have it deleted on request." },
];

export function Trust() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal>
        <SectionLabel num="05">Trust</SectionLabel>
        <h2 className="font-(family-name:--font-display) max-w-3xl text-[2.4rem] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[3.1rem]">
          His words. <span className="italic text-brick">Not ours.</span>
        </h2>
      </Reveal>
      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {TRUST.map((t, i) => (
          <Reveal key={t.title} delay={i * 0.1}>
            <div className="border-t-2 border-brick/70 pt-5">
              <h3 className="font-(family-name:--font-display) text-[1.4rem] text-ink">{t.title}</h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">{t.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <div className="mt-20 flex flex-col items-center text-center">
          <p className="font-(family-name:--font-display) max-w-2xl text-[1.9rem] leading-snug text-ink sm:text-[2.3rem]">
            Let Tom call Grandpa. <span className="italic text-brick">Keep him forever.</span>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/family" className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[0.95rem] font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-brick-dark">
              Open the family archive <span className="transition group-hover:translate-x-1">→</span>
            </Link>
            <Link href="/talk" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-ink/15 bg-card px-6 py-3.5 text-[0.95rem] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brick/50 hover:text-brick">
              Try Tom in your browser
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-[0.78rem] text-ink-soft sm:flex-row">
        <span className="font-(family-name:--font-display) text-[1.05rem] text-ink">Heirloom</span>
        <span className="text-center">
          Built in one afternoon at Cursor Hackathon Prague · Claude (via ElevenLabs) + OpenAI + Supabase + Render
        </span>
      </div>
    </footer>
  );
}
