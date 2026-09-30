const STEPS = [
  {
    title: "Talk",
    body: "Tom calls Grandpa on WhatsApp for 10–15 minutes and asks about his life. No app, no buttons.",
  },
  {
    title: "Remember",
    body: "Each call is summarised, so the next call picks up where the last story stopped.",
  },
  {
    title: "Write & connect",
    body: "Stories become cited chapters. People and places are matched to the family tree and exported as GEDCOM.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-(family-name:--font-display) text-[2rem] leading-tight text-ink sm:text-[2.4rem]">How it works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <div className="text-[0.8rem] font-semibold text-brick">Step {i + 1}</div>
              <h3 className="mt-2 text-[1.2rem] font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
