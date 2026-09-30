import Link from "next/link";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="font-(family-name:--font-display) text-[1.35rem] tracking-tight text-ink">
          Heirloom
        </Link>
        <div className="flex items-center gap-6 text-[0.88rem] text-ink-soft">
          <a href="#how" className="hidden transition-colors hover:text-ink sm:inline">How it works</a>
          <Link href="/talk" className="hidden transition-colors hover:text-ink sm:inline">Talk to Tom</Link>
          <Link href="/family" className="font-semibold text-ink transition-colors hover:text-brick">
            Family archive
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function Trust() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="max-w-2xl text-[1.05rem] leading-relaxed text-ink">
          Every sentence in the archive links to the moment Grandpa said it. The family reviews and approves each
          chapter, and can export or delete everything at any time.
        </p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-[0.8rem] text-ink-soft sm:flex-row">
        <span className="font-(family-name:--font-display) text-[1.05rem] text-ink">Heirloom</span>
        <span>Built at Cursor Hackathon Prague</span>
      </div>
    </footer>
  );
}
