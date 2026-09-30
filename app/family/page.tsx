import Link from "next/link";
import type { ReactNode } from "react";
import { getDb } from "@/lib/store";
import {
  getOverview,
  getTimeline,
  routes,
  type PersonCardVM,
  type Timeline,
  type TimelineItem,
  type TopicCoverage,
  type TreeLinkStatus,
} from "@/lib/archive";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { Reveal } from "@/components/landing/Reveal";
import { StatCard } from "@/components/archive/shell/StatCard";
import { NextCallPill, PulseDot } from "@/components/archive/shell/NextCallPill";
import { QuoteCarousel } from "@/components/archive/shell/QuoteCarousel";

export const dynamic = "force-dynamic";

const CARD = "rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-[0_1px_0_rgba(59,42,30,0.04)]";
const DISPLAY = "font-(family-name:--font-display)";
const LINK = "font-medium text-brick underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick rounded";

export default async function FamilyOverviewPage() {
  const db = await getDb();
  const o = getOverview(db);
  const tl = getTimeline(db);
  const gp = o.grandparent;
  const tom = gp.grandchildName || "Tom";
  const first = gp.displayName.replace(/^Grandpa\s+/i, "") || gp.displayName;
  const s = o.stats;
  const conv = o.latestConversation;
  const age = tl.nowYear - gp.birthYear;
  const chaptersWritten = o.topics.filter((t) => t.state === "written").length;

  return (
    <main className="space-y-14 sm:space-y-16">
      {/* ── 01 Hero ─────────────────────────────────────────────── */}
      <section className="grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <SectionLabel num="01">The story so far</SectionLabel>
          <h1 className={`${DISPLAY} text-[2.7rem] leading-[1.02] font-medium tracking-tight text-ink sm:text-[3.8rem]`}>
            {gp.displayName}&apos;s <em className="text-brick italic">story</em>
          </h1>
          <p className="mt-4 text-[1.15rem] text-ink">
            {gp.fullName} · born {gp.birthYear} in {gp.birthPlace}
            {age > 0 && <span className="text-ink-soft"> · {age} this year</span>}
          </p>
          <p className="mt-1 text-ink-soft">
            {s.conversations > 0 ? (
              <>
                Told to {tom} over {s.conversations} WhatsApp {s.conversations === 1 ? "call" : "calls"}
                {conv && <> · last call {conv.date}</>}
              </>
            ) : (
              <>{tom} hasn&apos;t called yet. The first stories will appear here after the first call.</>
            )}
          </p>
          <p className="mt-6 max-w-[56ch] text-[1.05rem] leading-relaxed text-ink-soft">
            {first} just talks. {tom}, his AI grandson, calls him on WhatsApp, listens, and remembers. Everything he tells
            lands here for the family, and{" "}
            <span className="text-ink">every sentence links back to his own words.</span>
          </p>
        </div>

        {o.nextCall && o.nextCall.topic ? (
          <Reveal>
            <aside className={`${CARD} relative overflow-hidden border-moss/30`} aria-label="Next call">
              <div className="flex items-center gap-2 text-[0.72rem] font-semibold tracking-[0.2em] text-moss uppercase">
                <PulseDot /> Next WhatsApp call
              </div>
              <p className={`${DISPLAY} mt-3 text-[1.5rem] leading-snug text-ink`}>
                {tom} will ask about <em className="text-brick italic">{o.nextCall.topic}</em>
              </p>
              {o.nextCall.opener && (
                <div className="relative mt-5 rounded-2xl rounded-tl-sm bg-paper-dark px-4 py-3 text-ink">
                  <span className="mb-1 block text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    {tom} will open with
                  </span>
                  <span className={`${DISPLAY} text-[1.05rem] italic`}>“{o.nextCall.opener}”</span>
                </div>
              )}
              {o.nextCall.whyUnfinished && (
                <p className="mt-4 text-sm text-ink-soft">
                  <span className="font-medium text-ink">Why:</span> {o.nextCall.whyUnfinished}
                </p>
              )}
              <p className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">
                Nothing to press here. {tom} calls {first} on his own, and new stories show up after each call.
              </p>
            </aside>
          </Reveal>
        ) : null}
      </section>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <section aria-label="At a glance" className="-mt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard value={s.conversations} label={s.conversations === 1 ? "Call" : "Calls"} hint="Read transcripts →" href={routes.conversations()} />
          <StatCard value={s.minutesRecorded} label="Minutes" hint="of his voice" href={routes.conversations()} />
          <StatCard value={s.grandparentLines} label="Memories" hint={`${s.words.toLocaleString("en-US")} words`} href={routes.conversations()} />
          <StatCard value={s.people} label="People" hint={`${s.linkedToTree} in the tree`} href={routes.people()} tone="brick" />
          <StatCard value={s.places} label="Places" hint={`${s.events} events`} href={routes.places()} />
          <StatCard
            value={s.verifiedParagraphs}
            suffix={`/${s.totalParagraphs}`}
            label="Verified"
            hint="paragraphs, cited"
            href={routes.stories()}
            tone="moss"
          />
        </div>
      </section>

      {/* ── 02 Life at a glance ─────────────────────────────────────── */}
      {tl.items.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <SectionLabel num="02">Life at a glance</SectionLabel>
            <Link href={routes.timeline()} className={`${LINK} -mt-6 mb-6`}>
              Open the timeline →
            </Link>
          </div>
          <MiniTimeline tl={tl} />
        </section>
      )}

      {/* ── 03 Latest call + next time ─────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <SectionLabel num="03">The latest call</SectionLabel>
          {conv ? (
            <article className={CARD}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
                <span className={`${DISPLAY} text-[1.6rem] text-ink`}>{conv.title}</span>
                <span>{conv.date}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <WhatsAppIcon /> {conv.channel}
                </span>
                {conv.durationMin != null && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{conv.durationMin} min</span>
                  </>
                )}
              </div>
              {conv.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {conv.topics.map((t) => (
                    <span key={t.key} className="rounded-full border border-line bg-paper px-3 py-0.5 text-sm text-ink-soft">
                      {t.label}
                    </span>
                  ))}
                  {conv.continuedThread && (
                    <span className="rounded-full border border-brick/30 bg-brick/10 px-3 py-0.5 text-sm text-brick-dark">
                      ↪ picked up: {conv.continuedThread.title}
                    </span>
                  )}
                </div>
              )}
              {conv.summary && <p className="mt-4 max-w-[65ch] text-[1.08rem] leading-[1.7] text-ink">{conv.summary}</p>}
              {conv.keyFacts.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {conv.keyFacts.slice(0, 4).map((f) => (
                    <li key={f} className="flex gap-2.5 text-ink-soft">
                      <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brick/60" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
              {conv.highlight && (
                <figure className="mt-5 border-l-2 border-brick/40 pl-4">
                  <blockquote className={`${DISPLAY} text-[1.15rem] leading-snug text-ink italic`}>“{conv.highlight.quote}”</blockquote>
                  <figcaption className="mt-1.5 text-sm text-ink-soft">
                    {conv.highlight.speaker} · {conv.highlight.source} ·{" "}
                    <Link href={conv.highlight.href} className={LINK}>
                      open in conversation →
                    </Link>
                  </figcaption>
                </figure>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link href={conv.href} className={`${LINK} text-[1.05rem]`}>
                  Read the whole conversation →
                </Link>
                {conv.people.length > 0 && (
                  <span className="text-sm text-ink-soft">
                    People:{" "}
                    {conv.people.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ", "}
                        <Link href={p.href} className="text-ink underline decoration-line underline-offset-4 hover:text-brick">
                          {p.name}
                        </Link>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </article>
          ) : (
            <EmptyCard>{tom} hasn&apos;t called yet. After the first WhatsApp call, the summary will appear here.</EmptyCard>
          )}
        </div>

        <div>
          <SectionLabel num="04">Next time {tom} will ask</SectionLabel>
          <div className={`${CARD} space-y-4`}>
            {o.openThreads.length === 0 && o.resolvedThreads.length === 0 && (
              <p className="text-ink-soft">No unfinished stories. {tom} will pick a new life chapter on the next call.</p>
            )}
            {o.openThreads.map((t) => (
              <div key={t.thread.id} className="flex gap-3">
                <span className="mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-moss" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium text-ink">{t.thread.title}</p>
                  <p className="mt-0.5 text-[0.95rem] text-ink-soft">{t.thread.whyUnfinished}</p>
                  <p className="mt-1 text-sm text-moss">
                    Open{t.openedInCall != null && <> · started in call {t.openedInCall}</>}
                    {t.quotes[0] && (
                      <>
                        {" · "}
                        <Link href={t.quotes[0].href} className={LINK}>
                          where he left off →
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {o.resolvedThreads.map((t) => (
              <div key={t.thread.id} className="flex gap-3 opacity-90">
                <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-moss text-xs text-card" aria-hidden>
                  ✓
                </span>
                <div className="min-w-0">
                  <p className="text-ink-soft line-through decoration-ink-soft/40">{t.thread.title}</p>
                  <p className="mt-0.5 text-sm text-moss">
                    Finished{t.resolvedInCall != null && <> in call {t.resolvedInCall}</>}: {tom} came back to it, as promised.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {o.pendingMatches.length > 0 && (
            <div className="mt-4 rounded-2xl border border-warn bg-warn-soft/60 p-4 sm:p-5">
              <p className="text-[0.72rem] font-semibold tracking-[0.18em] text-ink uppercase">Needs a family member</p>
              {o.pendingMatches.map((m) => (
                <p key={m.match.id} className="mt-2 text-ink">
                  Is <span className="font-medium">{m.person?.mentionName ?? "this person"}</span> in his stories the same as{" "}
                  <span className="font-medium">
                    {m.treePerson ? `${m.treePerson.givenName} ${m.treePerson.surname}` : "someone"}
                  </span>
                  {m.treePerson?.birthYear ? ` (b. ${m.treePerson.birthYear})` : ""} in the family tree?{" "}
                  <Link href={m.href} className={LINK}>
                    Check and confirm →
                  </Link>
                </p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 05 Stories + chapter progress ─────────────────────────────── */}
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <SectionLabel num="05">His life, chapter by chapter</SectionLabel>
          <p className="-mt-6 mb-6 text-ink-soft">
            {chaptersWritten} of {o.topics.length} chapters written
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {o.latestChapter ? (
            <article className={`${CARD} flex flex-col`}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-[0.72rem] font-semibold tracking-[0.18em] text-brick uppercase">Latest story</span>
                <span className="text-ink-soft">· {o.latestChapter.topicLabel}</span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    o.latestChapter.chapter.status === "approved"
                      ? "border-moss/30 bg-moss/10 text-moss"
                      : "border-line bg-paper-dark text-ink-soft"
                  }`}
                >
                  {o.latestChapter.chapter.status === "approved" ? "Approved by family" : "Draft"}
                </span>
              </div>
              <h2 className={`${DISPLAY} mt-2 text-[1.9rem] leading-tight text-ink`}>
                <Link href={o.latestChapter.href} className="hover:text-brick">
                  {o.latestChapter.chapter.title}
                </Link>
              </h2>
              <p className={`${DISPLAY} mt-3 max-w-[60ch] text-[1.12rem] leading-[1.7] text-ink/90`}>{o.latestChapter.excerpt}</p>
              <div className="mt-auto pt-5">
                <VerifiedMeter verified={o.latestChapter.verified} total={o.latestChapter.total} />
                <p className="mt-1.5 text-sm text-ink-soft">
                  Written from call{o.latestChapter.sessionsUsed.length === 1 ? "" : "s"} {o.latestChapter.sessionsUsed.join(" & ")}
                  {" · "}every paragraph cites his words
                </p>
                <Link href={o.latestChapter.href} className={`${LINK} mt-3 inline-block text-[1.05rem]`}>
                  Read the chapter →
                </Link>
              </div>
            </article>
          ) : (
            <EmptyCard>No chapter written yet. After a few calls, Heirloom writes the first chapter from his own words.</EmptyCard>
          )}
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {o.topics.map((t) => (
              <TopicTile key={t.key} t={t} tom={tom} />
            ))}
          </ul>
        </div>
      </section>

      {/* ── 06 People ─────────────────────────────────────────────── */}
      {o.people.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <SectionLabel num="06">People in his stories</SectionLabel>
            <Link href={routes.people()} className={`${LINK} -mt-6 mb-6`}>
              Everyone he remembers →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {o.people.slice(0, 8).map((p) => (
              <PersonTile key={p.id} p={p} />
            ))}
          </ul>
        </section>
      )}

      {/* ── 07 In his words ─────────────────────────────────────────── */}
      {o.quotes.length > 0 && (
        <section className="rounded-[2rem] bg-paper-dark px-6 py-10 sm:px-12 sm:py-14">
          <SectionLabel num="07">In his own words</SectionLabel>
          <QuoteCarousel quotes={o.quotes} />
        </section>
      )}

      {/* ── 08 Quick links ─────────────────────────────────────────── */}
      <section>
        <SectionLabel num="08">Explore the archive</SectionLabel>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink href={routes.timeline()} title="Timeline" desc={`${tl.items.length} moments, ${gp.birthYear}–${tl.nowYear}`} />
          <QuickLink href={routes.stories()} title="Stories" desc={`${s.chapters} ${s.chapters === 1 ? "chapter" : "chapters"}, fully cited`} />
          <QuickLink href={routes.conversations()} title="Conversations" desc={`${s.conversations} WhatsApp calls, word for word`} />
          <QuickLink href={routes.tree()} title="Family tree" desc={`${db.tree?.persons.length ?? 0} people · ${s.linkedToTree} from his stories`} />
          <QuickLink href={routes.people()} title="People" desc={`${s.people} people he mentioned`} />
          <QuickLink href={routes.places()} title="Places" desc={`${s.places} places in his life`} />
          <QuickLink href={routes.gedcom()} title="Export GEDCOM" desc="Take the tree to MyHeritage or Ancestry" external />
          <li>
            <div className="flex h-full min-h-11 flex-col justify-center rounded-2xl border border-dashed border-line p-4 text-sm text-ink-soft">
              Tip: press <kbd className="rounded border border-line bg-card px-1.5 font-sans">⌘K</kbd> or{" "}
              <kbd className="rounded border border-line bg-card px-1.5 font-sans">/</kbd> to search everything.
            </div>
          </li>
        </ul>
      </section>
    </main>
  );
}

// ─────────────────────────────── local pieces ───────────────────────────────

function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-card/60 p-6 text-ink-soft">{children}</div>;
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden className="text-moss">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.5-.3Z"
      />
    </svg>
  );
}

function VerifiedMeter({ verified, total }: { verified: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" role="img" aria-label={`${verified} of ${total} paragraphs verified`}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-3 w-5 rounded-sm ${i < verified ? "bg-moss" : "border border-dashed border-line bg-paper"}`} />
        ))}
      </div>
      <span className="text-sm font-medium text-moss">
        {verified} of {total} paragraphs verified
      </span>
    </div>
  );
}

function TopicTile({ t, tom }: { t: TopicCoverage; tom: string }) {
  const base = "flex h-full min-h-[5.5rem] flex-col justify-between rounded-2xl p-4 transition";
  if (t.state === "written" && t.chapter) {
    return (
      <li>
        <Link href={routes.story(t.chapter.id)} className={`${base} border border-line bg-card hover:border-brick/40 hover:shadow-[0_10px_24px_-18px_rgba(59,42,30,0.5)]`}>
          <span className="flex items-center justify-between gap-2 text-[0.72rem] font-semibold tracking-[0.16em] text-brick uppercase">
            {t.label}
            <span className="text-moss normal-case tracking-normal">✓ written</span>
          </span>
          <span className={`${DISPLAY} mt-1 text-[1.1rem] leading-snug text-ink`}>{t.chapter.title}</span>
          <span className="mt-1 text-xs text-ink-soft">
            {t.chapter.verified}/{t.chapter.total} verified
          </span>
        </Link>
      </li>
    );
  }
  if (t.state === "talked" || t.state === "next") {
    return (
      <li>
        <div className={`${base} border border-dashed border-moss/50 bg-moss/5`}>
          <span className="text-[0.72rem] font-semibold tracking-[0.16em] text-moss uppercase">{t.label}</span>
          <span className="mt-1 text-[0.95rem] text-ink">
            {t.state === "next" ? (
              <span className="inline-flex items-center gap-2">
                <PulseDot /> {tom} will ask on the next call
              </span>
            ) : (
              <>Talked about in call {t.coveredInCalls.join(" & ")} · chapter coming</>
            )}
          </span>
        </div>
      </li>
    );
  }
  return (
    <li>
      <div className={`${base} border border-dashed border-line`}>
        <span className="text-[0.72rem] font-semibold tracking-[0.16em] text-ink-soft uppercase">{t.label}</span>
        <span className="mt-1 text-[0.95rem] text-ink-soft italic">Not told yet</span>
      </div>
    </li>
  );
}

const TREE_BADGE: Record<TreeLinkStatus, { label: string; cls: string }> = {
  confirmed: { label: "In family tree", cls: "border-moss/30 bg-moss/10 text-moss" },
  suggested: { label: "Suggested match", cls: "border-warn bg-warn-soft text-ink" },
  inferred: { label: "In tree (via family)", cls: "border-brick/30 bg-brick/10 text-brick-dark" },
  none: { label: "Not in tree yet", cls: "border-dashed border-line text-ink-soft" },
};

function PersonTile({ p }: { p: PersonCardVM }) {
  const b = TREE_BADGE[p.treeStatus];
  return (
    <li>
      <Link
        href={p.href}
        className={`${CARD} flex h-full gap-4 transition hover:-translate-y-0.5 hover:border-brick/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick`}
      >
        <span
          aria-hidden
          className={`${DISPLAY} flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg ${
            p.treeStatus === "none" ? "border border-dashed border-line bg-paper text-ink-soft" : "bg-brick/10 text-brick-dark"
          }`}
        >
          {p.initials}
        </span>
        <span className="min-w-0">
          <span className={`${DISPLAY} block text-[1.2rem] leading-tight text-ink`}>{p.name}</span>
          <span className="mt-0.5 block text-sm text-ink-soft">{p.relation}</span>
          <span className="mt-1 block text-sm text-ink-soft">
            mentioned {p.mentionCount}×{p.callsMentioned.length > 0 && <> · call{p.callsMentioned.length > 1 ? "s" : ""} {p.callsMentioned.join(", ")}</>}
          </span>
          <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${b.cls}`}>
            <LeafIcon /> {b.label}
          </span>
        </span>
      </Link>
    </li>
  );
}

function LeafIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M20 3C9 3 4 9 4 16c0 1.6.3 3 .8 4.2l1.6-.8C7.8 14 11 10.7 15 9c-3.4 2.3-6 5.6-7.2 10 1.3.6 2.8 1 4.2 1C19 20 21 11 20 3Z" />
    </svg>
  );
}

function QuickLink({ href, title, desc, external = false }: { href: string; title: string; desc: string; external?: boolean }) {
  const cls = `${CARD} group flex h-full min-h-11 flex-col !p-4 transition hover:border-brick/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick`;
  const inner = (
    <>
      <span className={`${DISPLAY} text-[1.2rem] text-ink group-hover:text-brick`}>
        {title} <span aria-hidden>{external ? "↓" : "→"}</span>
      </span>
      <span className="mt-0.5 text-sm text-ink-soft">{desc}</span>
    </>
  );
  return (
    <li>
      {external ? (
        <a href={href} className={cls}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={cls}>
          {inner}
        </Link>
      )}
    </li>
  );
}

/** Compact horizontal life band: stage tints, decade ticks, one dot per dated item. */
function MiniTimeline({ tl }: { tl: Timeline }) {
  const span = Math.max(1, tl.nowYear - tl.birthYear);
  const pos = (y: number) => `${Math.min(100, Math.max(0, ((y - tl.birthYear) / span) * 100))}%`;
  const labelled = new Set(
    tl.items.filter((i) => i.kind === "event" || i.kind === "birth").map((i) => i.id),
  );
  const href = (i: TimelineItem) => i.href ?? `${routes.timeline()}#${encodeURIComponent(i.id)}`;
  // alternate labels above/below to avoid overlap
  let flip = false;
  return (
    <div className={`${CARD} overflow-x-auto`}>
      <div className="relative mx-6 h-[11.5rem] min-w-[48rem]">
        {/* stage bands */}
        <div className="absolute inset-x-0 top-[4.75rem] h-8 overflow-hidden rounded-full">
          {tl.stages.map((st, n) => (
            <div
              key={st.label}
              title={st.label}
              className={`absolute inset-y-0 ${n % 2 ? "bg-paper-dark" : "bg-paper"} border-r border-card`}
              style={{ left: pos(st.from), width: `calc(${pos(st.to)} - ${pos(st.from)})` }}
            >
              <span className="absolute inset-0 flex items-center justify-center truncate px-1 text-[0.65rem] tracking-wide text-ink-soft uppercase">
                {st.label}
              </span>
            </div>
          ))}
        </div>
        {/* decade ticks */}
        {tl.decades.map((d) => (
          <span key={d} className="absolute bottom-0 -translate-x-1/2 text-xs text-ink-soft tabular-nums" style={{ left: pos(d) }}>
            {d}
          </span>
        ))}
        {/* dots */}
        {tl.items
          .filter((i) => i.year != null)
          .map((i) => {
            const isLabelled = labelled.has(i.id);
            if (isLabelled) flip = !flip;
            const above = isLabelled && flip;
            const dot =
              i.kind === "call"
                ? "bg-moss border-moss"
                : i.kind === "tree"
                  ? "bg-card border-ink-soft"
                  : i.kind === "birth"
                    ? "bg-ink border-ink"
                    : i.kind === "not-yet-told"
                      ? "bg-card border-dashed border-moss"
                      : i.approx
                        ? "bg-card border-dashed border-brick"
                        : "bg-brick border-brick";
            return (
              <Link
                key={i.id}
                href={href(i)}
                className="group absolute top-[5.25rem] z-10 -translate-x-1/2 focus-visible:outline-none"
                style={{ left: pos(i.year!) }}
                aria-label={`${i.yearLabel}: ${i.title}`}
              >
                <span
                  className={`block h-4 w-4 rounded-full border-2 ring-4 ring-card transition group-hover:scale-125 group-focus-visible:outline-3 group-focus-visible:outline-brick ${dot}`}
                />
                {isLabelled && (
                  <span
                    className={`absolute left-1/2 w-32 -translate-x-1/2 text-center text-xs leading-tight ${
                      above ? "bottom-[2.6rem]" : "top-[2.6rem]"
                    }`}
                  >
                    <span className="block font-semibold text-ink tabular-nums">
                      {i.yearLabel}
                      {i.age != null && i.age > 0 && <span className="font-normal text-ink-soft"> · age {i.age}</span>}
                    </span>
                    <span className="line-clamp-2 block text-ink-soft group-hover:text-brick">{i.title}</span>
                  </span>
                )}
              </Link>
            );
          })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brick" /> from his stories</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-brick" /> approximate year</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-ink-soft" /> from the family tree</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-moss" /> calls with Tom</span>
        {tl.undated.length > 0 && <span>· {tl.undated.length} moment{tl.undated.length > 1 ? "s" : ""} without a year yet. Tom will ask.</span>}
      </div>
    </div>
  );
}
