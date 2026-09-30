import Link from "next/link";
import { getDb } from "@/lib/store";
import { LIFE_TOPICS } from "@/lib/topics";
import { getChapterView, getTopicCoverage, routes } from "@/lib/archive";
import type { Chapter } from "@/lib/types";
import { ChapterView } from "@/components/book/ChapterView";
import { GenerateChapterButton } from "@/components/book/GenerateChapterButton";

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

  const written = topics.filter((t) => t.state === "written" && t.chapter);

  return (
    <main className="mx-auto max-w-[46rem] text-lg">
      <header className="border-b border-line pb-10 pt-2">
        <h1 className="font-(family-name:--font-display) text-5xl font-medium leading-[1.05] tracking-tight text-ink">
          {speaker}’s stories
        </h1>
        <p className="mt-4 max-w-[60ch] text-[1.2rem] leading-[1.7] text-ink-soft">
          Stories written from {speaker}’s phone calls with {grandchild}. Tap a small number to read his exact words.
        </p>

        {written.length > 0 && (
          <nav aria-label="Chapters" className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Chapters</h2>
            <ol className="mt-3 space-y-1">
              {written.map((t, i) => (
                <li key={t.key}>
                  <a
                    href={`#${t.chapter!.id}`}
                    className="flex min-h-11 items-baseline gap-3 text-[1.15rem] text-ink underline-offset-4 hover:text-brick hover:underline focus-visible:outline-3 focus-visible:outline-brick"
                  >
                    <span className="w-6 shrink-0 tabular-nums text-ink-soft">{i + 1}.</span>
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </header>

      <div className="py-14">
        {views.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
            <p className="font-(family-name:--font-display) text-2xl text-ink">The first story is still being written.</p>
            <p className="mt-3 text-ink-soft">After the next call with {grandchild}, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-28">
            {views.map((v, i) => (
              <ChapterView key={`${v.chapter.id}-${v.chapter.generatedAt}`} view={v} chapterNo={i + 1} speaker={speaker} />
            ))}
          </div>
        )}
      </div>

      {untold.length > 0 && (
        <section className="border-t border-line py-12" aria-labelledby="untold-h">
          <h2 id="untold-h" className="font-(family-name:--font-display) text-3xl font-medium tracking-tight text-ink">
            Stories not written yet
          </h2>
          <ul className="mt-6 divide-y divide-line">
            {untold.map((t) => (
              <li key={t.key} id={`topic-${t.key}`} className="flex scroll-mt-28 flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-[1.15rem] font-medium text-ink">{t.label}</p>
                  <p className="text-base text-ink-soft">
                    {t.state === "next" && <>{grandchild} will ask about this on the next call.</>}
                    {t.state === "talked" && <>Talked about in a call, not written up yet.</>}
                    {t.state === "not-yet" && <>Not talked about yet.</>}
                  </p>
                </div>
                {t.state === "talked" && <GenerateChapterButton topic={t.key} label="Write this story" regenerate />}
              </li>
            ))}
          </ul>
          <details className="mt-8 text-base text-ink-soft">
            <summary className="min-h-11 cursor-pointer py-2">Details</summary>
            <p className="pt-2">
              {totalVerified} of {totalParas} paragraphs come straight from {speaker}’s own words · {views.length} stor
              {views.length === 1 ? "y" : "ies"} written · {untold.length} still to tell.{" "}
              <Link href={routes.conversations()} className="text-brick underline underline-offset-4">
                Read all call transcripts
              </Link>
            </p>
          </details>
        </section>
      )}
    </main>
  );
}
