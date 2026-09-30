import Link from "next/link";
import type { ReactNode } from "react";
import { getDb } from "@/lib/store";
import { getOverview, getTimeline, routes, type TopicCoverage } from "@/lib/archive";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/archive/shell/StatCard";

export const dynamic = "force-dynamic";

const DISPLAY = "font-(family-name:--font-display)";
const H2 = `${DISPLAY} text-[1.5rem] leading-tight text-ink`;
const LINK =
  "font-medium text-brick underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick rounded";

export default async function FamilyOverviewPage() {
  const db = await getDb();
  const o = getOverview(db);
  const tl = getTimeline(db);
  const gp = o.grandparent;
  const tom = gp.grandchildName || "Tom";
  const s = o.stats;
  const conv = o.latestConversation;
  const age = tl.nowYear - gp.birthYear;
  const chaptersWritten = o.topics.filter((t) => t.state === "written").length;

  return (
    <main className="space-y-12">
      {/* Who he is */}
      <header>
        <h1 className={`${DISPLAY} text-[2.4rem] leading-[1.05] font-medium tracking-tight text-ink sm:text-[2.8rem]`}>
          {gp.displayName}
        </h1>
        <p className="mt-2 text-[1.1rem] text-ink-soft">
          {gp.fullName}, born {gp.birthYear} in {gp.birthPlace}
          {age > 0 && <>, {age} this year</>}
        </p>
        <p className="mt-4 max-w-[60ch] text-ink-soft">
          {s.conversations > 0 ? (
            <>
              {tom} calls him on WhatsApp and asks about his life. Each chapter below is written from those calls and
              cites the lines it came from.
            </>
          ) : (
            <>{tom} hasn&apos;t called yet. Stories will appear here after the first call.</>
          )}
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <li>
            <StatCard value={s.conversations} label={s.conversations === 1 ? "call" : "calls"} href={routes.conversations()} />
          </li>
          <li>
            <StatCard value={s.minutesRecorded} label="minutes recorded" href={routes.conversations()} />
          </li>
          <li>
            <StatCard value={s.people} label="people mentioned" href={routes.people()} />
          </li>
          <li>
            <StatCard value={s.places} label="places" href={routes.places()} />
          </li>
          <li>
            <StatCard
              value={s.verifiedParagraphs}
              suffix={` / ${s.totalParagraphs}`}
              label="paragraphs verified"
              href={routes.stories()}
            />
          </li>
        </ul>
      </header>

      {/* Latest call | Next call */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className={`${H2} mb-4`}>Latest call</h2>
          {conv ? (
            <Card>
              <p className="text-sm text-ink-soft">
                {conv.date}
                {conv.durationMin != null && <> · {conv.durationMin} min</>}
                {conv.topics.length > 0 && <> · {conv.topics.map((t) => t.label).join(", ")}</>}
              </p>
              <h3 className={`${DISPLAY} mt-1 text-[1.3rem] text-ink`}>{conv.title}</h3>
              {conv.summary && <p className="mt-3 max-w-[65ch] leading-relaxed text-ink">{conv.summary}</p>}
              {conv.keyFacts.length > 0 && (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-ink-soft marker:text-line">
                  {conv.keyFacts.slice(0, 3).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {conv.highlight && (
                <figure className="mt-5 border-l-2 border-line pl-4">
                  <blockquote className={`${DISPLAY} text-[1.1rem] leading-snug text-ink italic`}>
                    “{conv.highlight.quote}”
                  </blockquote>
                  <figcaption className="mt-1 text-sm text-ink-soft">
                    {conv.highlight.speaker} ·{" "}
                    <Link href={conv.highlight.href} className={LINK}>
                      {conv.highlight.source}
                    </Link>
                  </figcaption>
                </figure>
              )}
              <Link href={conv.href} className={`${LINK} mt-5 inline-block`}>
                Read the transcript
              </Link>
            </Card>
          ) : (
            <Empty>No calls yet.</Empty>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className={`${H2} mb-4`}>Next call</h2>
            {o.nextCall && o.nextCall.topic ? (
              <Card>
                <p className="text-ink">
                  {tom} will ask about <span className="font-medium">{o.nextCall.topic}</span>.
                </p>
                {o.nextCall.opener && (
                  <p className={`${DISPLAY} mt-3 text-ink-soft italic`}>“{o.nextCall.opener}”</p>
                )}
                {o.nextCall.whyUnfinished && <p className="mt-3 text-sm text-ink-soft">{o.nextCall.whyUnfinished}</p>}
              </Card>
            ) : (
              <Empty>{tom} will pick a new topic on the next call.</Empty>
            )}
          </div>

          {(o.openThreads.length > 0 || o.resolvedThreads.length > 0) && (
            <div>
              <h2 className={`${H2} mb-4`}>Unfinished stories</h2>
              <Card className="divide-y divide-line !py-2">
                {o.openThreads.map((t) => (
                  <div key={t.thread.id} className="py-3">
                    <p className="font-medium text-ink">{t.thread.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      Open{t.openedInCall != null && <>, since call {t.openedInCall}</>}
                      {t.quotes[0] && (
                        <>
                          {" · "}
                          <Link href={t.quotes[0].href} className={LINK}>
                            where he left off
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                ))}
                {o.resolvedThreads.map((t) => (
                  <div key={t.thread.id} className="py-3">
                    <p className="text-ink-soft">{t.thread.title}</p>
                    <p className="mt-0.5 text-sm text-moss">
                      Finished{t.resolvedInCall != null && <> in call {t.resolvedInCall}</>}
                    </p>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {o.pendingMatches.length > 0 && (
            <div>
              <h2 className={`${H2} mb-4`}>Needs your check</h2>
              <Card className="space-y-3 border-warn">
                {o.pendingMatches.map((m) => (
                  <p key={m.match.id} className="text-ink">
                    Is <span className="font-medium">{m.person?.mentionName ?? "this person"}</span> the same as{" "}
                    <span className="font-medium">
                      {m.treePerson ? `${m.treePerson.givenName} ${m.treePerson.surname}` : "someone"}
                    </span>
                    {m.treePerson?.birthYear ? ` (b. ${m.treePerson.birthYear})` : ""} in the family tree?{" "}
                    <Link href={m.href} className={LINK}>
                      Review
                    </Link>
                  </p>
                ))}
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* Chapters */}
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className={H2}>Chapters</h2>
          <p className="text-sm text-ink-soft">
            {chaptersWritten} of {o.topics.length} written ·{" "}
            <Link href={routes.stories()} className={LINK}>
              All stories
            </Link>
          </p>
        </div>
        <Card className="!p-0">
          <ul className="divide-y divide-line">
            {o.topics.map((t) => (
              <TopicRow key={t.key} t={t} tom={tom} />
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-ink-soft">{children}</div>;
}

function TopicRow({ t, tom }: { t: TopicCoverage; tom: string }) {
  let status: ReactNode;
  if (t.state === "written" && t.chapter) {
    status = (
      <span className="text-moss">
        Written · {t.chapter.verified}/{t.chapter.total} verified
      </span>
    );
  } else if (t.state === "next") {
    status = <span className="text-ink">Next call</span>;
  } else if (t.state === "talked") {
    status = <span>Talked about in call {t.coveredInCalls.join(" & ")}</span>;
  } else {
    status = <span>Not yet</span>;
  }
  const body = (
    <>
      <span className="min-w-0">
        <span className="block text-ink">{t.label}</span>
        {t.state === "written" && t.chapter && <span className="block text-sm text-ink-soft">{t.chapter.title}</span>}
      </span>
      <span className="shrink-0 text-right text-sm text-ink-soft">{status}</span>
    </>
  );
  const cls = "flex min-h-11 items-center justify-between gap-4 px-5 py-3";
  return (
    <li>
      {t.state === "written" && t.chapter ? (
        <Link
          href={routes.story(t.chapter.id)}
          className={`${cls} hover:bg-paper-dark focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brick`}
          aria-label={`${t.label}: ${t.chapter.title}`}
        >
          {body}
        </Link>
      ) : (
        <div className={cls} title={t.state === "next" ? `${tom} will ask about this next` : undefined}>
          {body}
        </div>
      )}
    </li>
  );
}
