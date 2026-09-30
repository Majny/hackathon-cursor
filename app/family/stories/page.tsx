import Link from "next/link";
import { getDb } from "@/lib/store";
import { LIFE_TOPICS } from "@/lib/topics";
import { getChapterView, getTopicCoverage, routes, type TopicCoverage } from "@/lib/archive";
import type { Chapter } from "@/lib/types";
import { ChapterView } from "@/components/book/ChapterView";
import { GenerateChapterButton } from "@/components/book/GenerateChapterButton";
import { SectionLabel } from "@/components/landing/SectionLabel";

export const dynamic = "force-dynamic";

const topicOrder = (c: Chapter) => {
  const i = LIFE_TOPICS.findIndex((t) => t.key === c.key);
  return i === -1 ? 99 : i;
};

export default async function StoriesPage() {
  const db = await getDb();
  const gp = db.grandparent;
  const first = gp?.fullName?.split(/\s+/)[0] ?? "Grandpa";
  const speaker = gp?.displayName || `Grandpa ${first}`;
  const grandchild = gp?.grandchildName || "Tom";

  const chapters = [...db.chapters].sort((a, b) => topicOrder(a) - topicOrder(b));
  const views = chapters.map((ch) => getChapterView(db, ch));
  const topics = getTopicCoverage(db);
  const untold = topics.filter((t) => t.state !== "written");
  const totalVerified = views.reduce((n, v) => n + v.verified, 0);
  const totalParas = views.reduce((n, v) => n + v.total, 0);

  return (
    <main className="mx-auto max-w-6xl">
      {/* Hero */}
      <header className="border-b border-line pb-10 pt-2 sm:pb-14">
        <SectionLabel num="03">The family book</SectionLabel>
        <h1 className="font-(family-name:--font-display) text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl">
          {speaker}’s <em className="italic text-brick">stories</em>
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.15rem] leading-[1.7] text-ink-soft">
          Told to his grandson {grandchild} over WhatsApp calls, written down with the help of AI. Nothing is invented: tap any
          little number to see the exact words he said.
        </p>
        {totalParas > 0 && (
          <p className="mt-3 text-base text-ink-soft">
            <span className="font-semibold text-moss">
              {totalVerified} of {totalParas}
            </span>{" "}
            paragraphs verified against his own words · {views.length} chapter{views.length === 1 ? "" : "s"} written ·{" "}
            {untold.length} still to tell
          </p>
        )}

        {/* Topic chip row */}
        <nav aria-label="Life chapters" className="mt-8 flex flex-wrap gap-2.5">
          {topics.map((t) => (
            <TopicChip key={t.key} t={t} />
          ))}
        </nav>
      </header>

      {/* Chapters */}
      <div className="mx-auto max-w-[44rem] py-14">
        {views.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <p className="font-(family-name:--font-display) text-2xl text-ink">The first chapter is still being written.</p>
            <p className="mt-3 text-ink-soft">
              After the next call with {grandchild}, the story appears here, every sentence linked to what Grandpa said.
            </p>
          </div>
        ) : (
          <div className="space-y-28">
            {views.map((v, i) => (
              <ChapterView key={`${v.chapter.id}-${v.chapter.generatedAt}`} view={v} chapterNo={i + 1} speaker={speaker} />
            ))}
          </div>
        )}
        <p className="mt-20 text-center font-(family-name:--font-display) text-3xl text-brick/60" aria-hidden>
          ❦
        </p>
      </div>

      {/* Not yet told */}
      {untold.length > 0 && (
        <section className="border-t border-line py-14" aria-labelledby="untold-h">
          <SectionLabel num="∴">Chapters still to come</SectionLabel>
          <h2 id="untold-h" className="font-(family-name:--font-display) text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Parts of his life <em className="italic text-brick">not yet told</em>
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {untold.map((t) => (
              <li
                key={t.key}
                id={`topic-${t.key}`}
                className={`scroll-mt-28 rounded-2xl border-2 border-dashed p-5 sm:p-6 ${
                  t.state === "next" ? "border-moss/60 bg-moss/5" : t.state === "talked" ? "border-brick/35 bg-card" : "border-line bg-paper"
                }`}
              >
                <p className="font-(family-name:--font-display) text-2xl text-ink">{t.label}</p>
                <p className="mt-2 text-base leading-relaxed text-ink-soft">
                  {t.state === "next" && (
                    <>
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-moss align-middle" aria-hidden />
                      <span className="font-medium text-moss">Tom will ask on the next call.</span>
                    </>
                  )}
                  {t.state === "talked" && (
                    <>Talked about in call {t.coveredInCalls.join(" & ")}, not written up yet.</>
                  )}
                  {t.state === "not-yet" && <>Grandpa hasn’t told this part yet.</>}
                </p>
                {t.state === "talked" && (
                  <div className="mt-3">
                    <GenerateChapterButton topic={t.key} label="Write this chapter" regenerate />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-10 text-base text-ink-soft">
            Want to hear the originals?{" "}
            <Link href={routes.conversations()} className="font-medium text-brick underline underline-offset-4 hover:text-brick-dark">
              Read the full conversations →
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}

function TopicChip({ t }: { t: TopicCoverage }) {
  const base =
    "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-base transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
  if (t.state === "written" && t.chapter) {
    return (
      <a href={`#${t.chapter.id}`} className={`${base} border-brick/40 bg-brick/10 font-medium text-brick-dark hover:bg-brick hover:text-white`}>
        <span aria-hidden>✦</span>
        {t.label}
        <span className="text-sm opacity-80">
          {t.chapter.verified}/{t.chapter.total}
        </span>
      </a>
    );
  }
  const tone =
    t.state === "next"
      ? "border-dashed border-moss/60 text-moss hover:bg-moss/10"
      : t.state === "talked"
        ? "border-dashed border-brick/40 text-ink hover:bg-card"
        : "border-dashed border-line text-ink-soft hover:bg-card";
  return (
    <a href={`#topic-${t.key}`} className={`${base} ${tone}`}>
      {t.state === "next" && <span className="h-2 w-2 animate-pulse rounded-full bg-moss" aria-hidden />}
      {t.label}
      <span className="text-sm opacity-80">{t.state === "next" ? "next call" : t.state === "talked" ? "talked" : "not yet told"}</span>
    </a>
  );
}
