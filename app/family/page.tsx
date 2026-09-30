import Link from "next/link";
import { getDb } from "@/lib/store";
import { getChapterView, getOverview, routes } from "@/lib/archive";
import { MatchAnswer } from "@/components/archive/shell/MatchAnswer";

export const dynamic = "force-dynamic";

const DISPLAY = "font-(family-name:--font-display)";
const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
const QUIET_LINK = `rounded text-ink-soft underline-offset-4 hover:text-brick hover:underline ${FOCUS}`;

/** Home: a simple family feed. Greeting, what needs an answer, the newest story, the next call. */
export default async function FamilyHomePage() {
  const db = await getDb();
  const o = getOverview(db);
  const gp = o.grandparent;
  const tom = gp.grandchildName || "Tom";
  const grandpa = gp.displayName || "Grandpa";

  const matches = o.pendingMatches.filter((m) => m.person && m.treePerson);
  const drafts = db.chapters.filter((c) => c.status !== "approved").map((c) => getChapterView(db, c));
  const needsAnswer = matches.length > 0 || drafts.length > 0;

  const story = o.latestChapter;
  const call = o.latestConversation;

  return (
    <main className="mx-auto max-w-3xl space-y-10 text-[1.15rem] leading-relaxed">
      {/* 1. Greeting */}
      <header>
        <h1 className={`${DISPLAY} text-[2.4rem] leading-[1.1] font-medium tracking-tight text-ink sm:text-[2.8rem]`}>
          {grandpa}&apos;s stories
        </h1>
        <p className="mt-3 max-w-[55ch] text-[1.2rem] text-ink-soft">
          {tom}, an AI grandson, calls {grandpa} and writes down what he tells. Here you can read it.
        </p>
      </header>

      {/* 2. Needs your answer (only when there is something) */}
      {needsAnswer && (
        <section aria-labelledby="needs-answer" className="rounded-3xl border-2 border-brick/40 bg-card p-6 sm:p-8">
          <h2 id="needs-answer" className={`${DISPLAY} text-[1.6rem] leading-tight text-ink`}>
            Needs your answer
          </h2>
          <div className="mt-4 divide-y divide-line">
            {matches.map((m) => (
              <div key={m.match.id} className="py-5 first:pt-0 last:pb-0">
                <p className="text-ink">
                  Grandpa mentioned <span className="font-semibold">{m.person!.mentionName}</span>. Is he{" "}
                  <span className="font-semibold">
                    {m.treePerson!.givenName} {m.treePerson!.surname}
                  </span>
                  {m.treePerson!.birthYear ? ` (born ${m.treePerson!.birthYear})` : ""} from your family tree?
                </p>
                <MatchAnswer matchId={m.match.id} />
              </div>
            ))}
            {drafts.map((d) => (
              <div key={d.chapter.id} className="py-5 first:pt-0 last:pb-0">
                <p className="text-ink">
                  A new story is ready: <span className="font-semibold">{d.chapter.title}</span>. Please read it and
                  approve it.
                </p>
                <Link
                  href={d.href}
                  className={`mt-4 inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-[1.1rem] font-medium text-paper hover:bg-ink/90 ${FOCUS}`}
                >
                  Read and approve
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Newest story (or the latest call if no story yet) */}
      <section aria-labelledby="newest">
        {story ? (
          <article className="rounded-3xl border border-line bg-card p-6 sm:p-8">
            <p id="newest" className="text-[1rem] font-medium text-ink-soft">
              Newest story
            </p>
            <h2 className={`${DISPLAY} mt-1 text-[1.9rem] leading-tight text-ink`}>{story.chapter.title}</h2>
            <p className="mt-4 max-w-[62ch] text-ink">{story.chapter.paragraphs[0]?.text ?? story.excerpt}</p>
            <Link
              href={story.href}
              className={`mt-6 inline-flex min-h-14 items-center rounded-full bg-brick px-8 text-[1.2rem] font-semibold text-paper hover:bg-brick/90 ${FOCUS}`}
            >
              Read the story
            </Link>
          </article>
        ) : call ? (
          <article className="rounded-3xl border border-line bg-card p-6 sm:p-8">
            <p id="newest" className="text-[1rem] font-medium text-ink-soft">
              Latest call · {call.date}
            </p>
            <h2 className={`${DISPLAY} mt-1 text-[1.9rem] leading-tight text-ink`}>{call.title}</h2>
            {call.summary && <p className="mt-4 max-w-[62ch] text-ink">{call.summary}</p>}
            <Link
              href={call.href}
              className={`mt-6 inline-flex min-h-14 items-center rounded-full bg-brick px-8 text-[1.2rem] font-semibold text-paper hover:bg-brick/90 ${FOCUS}`}
            >
              Read the call
            </Link>
          </article>
        ) : (
          <p id="newest" className="rounded-3xl border border-dashed border-line p-6 text-ink-soft sm:p-8">
            {tom} hasn&apos;t called yet. The first story will appear here after the first call.
          </p>
        )}
      </section>

      {/* 4. Next call */}
      {o.nextCall?.topic && (
        <p className="text-ink">
          <span className="font-medium">Next call:</span> next time {tom} will ask about{" "}
          <span className="font-medium">{o.nextCall.topic}</span>.
        </p>
      )}

      {/* 5. Quiet links */}
      <nav aria-label="More in the archive" className="border-t border-line pt-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[1.1rem]">
          <Link href={routes.people()} className={QUIET_LINK}>People</Link>
          <span aria-hidden className="text-line">·</span>
          <Link href={routes.conversations()} className={QUIET_LINK}>Calls</Link>
          <span aria-hidden className="text-line">·</span>
          <Link href={routes.timeline()} className={QUIET_LINK}>Timeline</Link>
          <span aria-hidden className="text-line">·</span>
          <Link href={routes.tree()} className={QUIET_LINK}>Family tree</Link>
        </p>
      </nav>
    </main>
  );
}
