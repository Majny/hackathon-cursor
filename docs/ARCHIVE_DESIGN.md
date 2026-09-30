# Heirloom Family Archive: build spec (/family/*)

**Deadline:** code freeze is 18:00. All builder work must be done and passing `tsc` by **17:05**.

**Pitch the UI must make obvious:** "Grandpa talks to Tom on WhatsApp. The family gets a living archive. Nothing is invented: every sentence links back to his own words."

- There is **no call button** anywhere under /family. The call engine runs in the backend.
- The web only *reports* it, with a pulsing moss "Next call: Tom will ask about …" pill.

---

## 0. Ground rules for builders

- Data comes only from **`lib/archive.ts`** selectors, called in server components: `const db = await getDb()` from `@/lib/store`, then `getOverview(db)` and so on.
  - Do not re-derive joins in pages.
  - If a selector is missing something, add a *local* helper in your own file and tell the orchestrator. Do not edit `lib/archive.ts`; the architect owns it.
- **Pages:** `export const dynamic = "force-dynamic"`.
- **Language:** English UI. Keep Czech names as they are (Věrka, Kladno, Poldi).
- **Links:** use `routes.*` from `lib/archive.ts` for every href. Never hand-build URLs.
- **Packages:** no new npm packages. `motion/react` is available. Wrap animation in `useReducedMotion()`.
- **Commands:**
  - Do not run next build, dev or start.
  - Do not touch git.
  - Verify with `npx tsc --noEmit`.
- **Files:** only edit files you own (section 7).

## 1. Routes and navigation

| Route | Page | Notes |
|---|---|---|
| `/family` | Overview | the jury screen |
| `/family/timeline` | Life timeline | events are anchored `#ev-…`; clicking a dot opens a drawer |
| `/family/stories` | Stories (book) | chapters anchored `#ch-…`, paragraphs anchored `#<paragraphId>` |
| `/family/book` | → `redirect("/family/stories")` | |
| `/family/people` | People list | chips, and a Cards/Table toggle |
| `/family/people/[id]` | Person page | EntityPage layout |
| `/family/places` | Places list | |
| `/family/places/[id]` | Place page | EntityPage layout with a "stamp" header |
| `/family/conversations` | Conversations list | |
| `/family/conversations/[id]` | Transcript | turn anchors `#s2-t07` get the `:target` glow |
| `/family/sessions/[id]` | → `redirect("/family/conversations/[id]")` | keep this file as a redirect only |
| `/family/tree` | Family tree | "Export GEDCOM" button lives here |

Top nav, in this order, with text labels only:

**Overview · Timeline · Stories · People · Places · Conversations · Family tree**

On the right of the nav: **[Search ⌘K]** pill and **[A / A+]** text-size toggle.

- Remove "Talk →". Nothing links to `/talk` from /family.
- Show a breadcrumb on detail pages, for example: `Overview / People / Pepa Dvořák`.

## 2. Visual language (shared with the landing page)

### Fonts
Load them in `app/family/layout.tsx`, copying the pattern from `app/page.tsx`:

```ts
const display = Fraunces({ subsets:["latin","latin-ext"], style:["normal","italic"], variable:"--font-display" });
const body = Inter({ subsets:["latin","latin-ext"], variable:"--font-body" });
// wrapper: className={`${display.variable} ${body.variable} font-(family-name:--font-body) bg-paper text-ink min-h-screen`}
```

- Headlines: `font-(family-name:--font-display)`.
- Accent word: `<em className="italic text-brick">…</em>`. Examples: "Grandpa Jarda's *story*", "Everyone he *remembers*".

### Tokens (`app/globals.css`, already defined)

| Token | Value | Use |
|---|---|---|
| `paper` | #faf5ea | page background |
| `paper-dark` | | bands, zebra |
| `card` | #fffdf8 | surfaces |
| `line` | #e2d5bd | borders |
| `ink` | #3b2a1e | text |
| `ink-soft` | | meta text only, ≥14px |
| `brick` / `brick-dark` | | links, accents, "in tree" |
| `moss` | | verified, resolved, next call |
| `warn` / `warn-soft` | | needs checking, `:target` glow |

### Section labels
Use the landing's `components/landing/SectionLabel.tsx`: `<SectionLabel num="01">The story so far</SectionLabel>`.

### Layout
- Container: `mx-auto max-w-6xl px-5 sm:px-8`.
- Vertical rhythm: `py-10`/`py-14` between sections.
- Cards: `rounded-2xl border border-line bg-card p-5 sm:p-6 shadow-[0_1px_0_rgba(59,42,30,0.04)]`.

### Accessibility for older eyes
- Body text is 18px (the root is already 18px).
- Reading text: `text-[1.15rem] leading-[1.7] max-w-[65ch]`.
- Tap targets are at least 44px.
- Focus ring: `focus-visible:outline-3 focus-visible:outline-brick focus-visible:outline-offset-2`.
- Chips are single-select and spaced with `gap-2.5`.
- Tooltips must open on focus and click, not only on hover.

### Glow on arrival
The shell owner adds this to `app/globals.css`:

```css
@keyframes arrive { 0%,40% { background: var(--color-warn-soft); box-shadow: 0 0 0 6px var(--color-warn-soft); } 100% { background: transparent; box-shadow: none; } }
:target { animation: arrive 2.4s ease-out; border-radius: 1rem; }
@media (prefers-reduced-motion: reduce) { :target { animation: none; background: var(--color-warn-soft); } }
html.text-lg-mode { font-size: 20.25px; } /* A+ toggle = 112.5% */
```

### Copy tone
- Warm, plain, first person plural ("we"). Never write "No data".
- Examples:
  - "Grandpa hasn't told this part yet. Tom will ask on the next call."
  - "Year unknown. Tom will ask."
  - "Not found in the family tree yet. Do you know who this is?"
- Dates in words: "1958 · when he was 12".
- Quote source line: "Grandpa Jarda · Call 2 · 3 min in" (use `QuoteRef.speaker` and `QuoteRef.source`).

## 3. `lib/archive.ts` API (already built and tested in `tests/archive.test.ts`)

### Helpers
- `routes`: `overview`, `timeline`, `stories`, `story(id)`, `people`, `person(id)`, `places`, `place(id)`, `conversations`, `conversation(id)`, `turn(sid, tid)`, `event(id)`, `tree(focus?)`, `gedcom`.
- `normalizeSearch`, `formatYear(y, approx)` (returns "c. 1948" or "Year unknown"), `ageAt`, `initials`, `formatDay`, `truncate`, `sessionLabel`.

### Quotes and chapters
- `quoteForTurn(db, turnId)` and `quotesFor(db, turnIds, {grandparentOnly})` return `QuoteRef`:
  - Fields: `{turnId, sessionId, sessionIndex, sessionDate, role, speaker, text, quote, minuteIn, source, href}`.
  - Grandpa's own words come first.
- `getChapterView(db, ch)` returns `ChapterView`: `{chapter, topicLabel, paragraphs: CitedParagraph[] (each has numbered: {n, turnId, quote, source, href}[]), verified, total, href, excerpt, sessionsUsed}`.
- `getTopicCoverage(db)` returns `TopicCoverage[]`, one per life topic, with `state` of written, talked, next or not-yet.
- `getThreads(db)` returns `ThreadView[]` (open ones first): `{thread, status, openedInCall, resolvedInCall, quotes}`.

### People
- `getPeople(db)` returns `PersonCardVM[]`: `{id, name, initials, relation, group: family|friends, years, place, mentionCount, callsMentioned, treeStatus, treePerson, href}`.
- `treeStatus` is one of:
  - `confirmed`
  - `suggested`: a Match exists.
  - `inferred`: linked through Grandpa's own family in the tree. Anna → I4, František → I3, Věrka → I5.
  - `none`
- `getPersonProfile(db, id)` returns the card fields plus `{entity, notes, match, matchTreePerson, alsoConsidered[{treePerson, score, why}], inferredReason, quotes, firstMentioned, events[{id, title, year, href}], places[{id, name, href}], chapterRefs[{chapterId, title, paragraphId, n, href}], treeHref}`.

### Places
- `getPlaces(db)` returns `PlaceCardVM[]`.
- `getPlaceProfile(db, id)` returns `{…, place, quotes, events, people, chapterRefs}`.

### Timeline
- `getTimeline(db)` returns `{birthYear, nowYear, items, undated, stages, decades}`.
- `TimelineItem` is `{id, year, approx, yearLabel, age, title, description, kind, source, people, places, quotes, href}`.
  - `kind` is one of: birth, event, tree, call, not-yet-told.
- Pepa's wedding is dated c. 1972 from the tree.
- Grandpa's own marriage (1970) comes from the tree.
- The two calls appear as 2026 items.

### Conversations
- `getConversations(db)`, newest first, returns `ConversationCardVM[]`:
  - Fields: `{id, index, title, date, channel: "WhatsApp call", durationMin, lineCount, grandparentLines, topics, summary, firstSentence, keyFacts, continuedThread, openedThreads, resolvedThreads, people, highlight, href}`.
- `getConversation(db, id)` returns `ConversationDetail`: the card fields plus `{session, nextTopic, nextSessionOpener, turns: (QuoteRef & {people, places, chapterRefs})[]}`.

### Overview
`getOverview(db)` returns `{grandparent, title, stats, latestConversation, nextCall{topic, opener, threadId, whyUnfinished}, openThreads, resolvedThreads, pendingMatches, latestChapter, topics, people, featuredQuote, quotes}`.
- `stats` is `ArchiveStats`: `{conversations, minutesRecorded, grandparentLines, words, people, places, events, chapters, verifiedParagraphs, totalParagraphs, openThreads, linkedToTree}`.

### Search
- `buildSearchIndex(db)` returns `SearchDoc[]` of `{id, kind, title, subtitle, text, href, year?}`.
  - `kind` is one of: person, place, event, chapter, quote, conversation.
  - Build it in the server layout and pass it as a prop to the client palette. It is about 60 docs.
- `searchDocs(docs, q, perKind=5)` returns `SearchHit[]`, each with a `snippet {before, match, after}`. Matching ignores diacritics.

### Auto-linking
- `entityLinkTerms(db)` returns `EntityLink[]`.
- `linkEntities(text, links)` returns `TextPart[]`. Render the parts as `<Link>` elements to auto-link names in prose (the first mention per entity).

## 4. Shared components (`components/archive/*`, owned by Agent A)

Agent A must ship these **first (by 16:40)**. The props below are frozen, so other agents can code against them straight away.

```ts
// Server-safe (no "use client") unless marked
QuoteCard({ q: QuoteRef, size?: "sm"|"lg", showSource?: boolean /*default true*/ })
  // serif italic quote in “ ”, source line "Grandpa Jarda · Call 2 · 3 min in", "Open in conversation →" link to q.href
Avatar({ initials: string, tone?: "brick"|"moss"|"neutral", size?: number /*px, default 48*/ })
  // circle, Fraunces initials
TreeBadge({ status: TreeLinkStatus })
  // confirmed → moss "In family tree"; suggested → warn "Suggested match"; inferred → brick-soft "In family tree (via family)"; none → dashed "Not in tree yet"; small leaf SVG + text
LinkedText({ text: string, links: EntityLink[] })       // uses linkEntities, brick underline-offset links
EntityHeader({ kind: "person"|"place", title: string, subtitle?: string, meta?: string[], crumbs: {label:string, href?:string}[], avatar?: ReactNode })
Chip({ href?: string, active?: boolean, children, count?: number, dashed?: boolean })  // ≥44px tall
NextCallPill({ topic: string })                         // "use client" ok; pulsing moss dot + "Next call · Tom will ask about {topic}"
SearchPalette({ docs: SearchDoc[] })                    // "use client"; renders the header pill + modal
TextSizeToggle()                                        // "use client"; toggles html.text-lg-mode, localStorage try/catch
```

Reuse these components:
- `components/landing/SectionLabel.tsx`
- `components/landing/Reveal.tsx`
- `components/ui/{Card,Badge,Button}`
- `components/book/{ChapterView,CitationChip}`

## 5. Page wireframes

### 5.1 Overview `/family` (Agent B)

```
┌ header: ❦ Heirloom · The Novák family archive   Overview Timeline Stories People Places Conversations Family tree   [Search ⌘K] [A+] ┐
│ 01 — THE STORY SO FAR                                                                                               │
│ Grandpa Jarda's *story*                               ┌─────────────────────────────────────────┐                   │
│ Jaroslav Novák · born 1946, Kladno                    │ ● Next call — Tom will ask about         │                   │
│ Told to Tom over 2 WhatsApp calls · last call 30 Sep  │   Military service in Jihlava (1965–67)  │                   │
│                                                       │ “Hi Grandpa! Last time you promised…”    │ (speech bubble)   │
│                                                       └─────────────────────────────────────────┘                   │
│  2          14         18          4         4          5/5                                                         │
│  CALLS      MINUTES    MEMORIES    PEOPLE    PLACES     VERIFIED   ← each a link, count-up (motion)                 │
├─ 02 — LIFE AT A GLANCE: <MiniTimeline> (horizontal band from getTimeline, dots only, link to /family/timeline) ────┤
├─ 03 ──────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┤
│ LATEST STORY                              │ TOM WILL ASK NEXT TIME                                                  │
│ The Boy from the Poldi Chimneys  [Draft]  │ ○ Military service in Jihlava — whyUnfinished   (open, from call 2)     │
│ excerpt (serif)…                          │ ✓ Running off to the fair — resolved in call 2 (moss)                   │
│ ■■■■■ 5 of 5 paragraphs verified          │                                                                         │
│ Read the chapter →                        │                                                                         │
├─ 04 — PEOPLE IN HIS STORIES: 4 avatar cards (Avatar + name + relation + "mentioned 7×" + TreeBadge) ───────────────┤
├─ 05 — IN HIS WORDS: big pull-quote carousel (overview.quotes, crossfade 6 s, pause on hover) ───────────────────────┤
├─ 06 — LIFE CHAPTERS: 7 topic tiles (getTopicCoverage). Written = card; talked/next = moss dashed; not-yet = dashed "Not yet told" ┤
└─ pending matches strip: "1 tree match needs a family member to confirm → Pepa Dvořák" ──────────────────────────────┘
```

### 5.2 Timeline `/family/timeline` (Agent B)

```
1946 ────┬──────1950──────1960──────1970──────1980 … 2026
 [Childhood 0–12][School 12–19][Mil 19–21][ Work & family ……… ][ Retirement ]   ← tinted paper-dark bands
   ●born          ●1958 fair (age 12)  ●1965 Jihlava  ◌c.1972 Pepa+Věrka (dashed = approx)  ◆1970 marriage (tree, outline)   ●● calls 2026
Year unknown tray (right):  "When? Tom will ask."
```

- Position each item at `left = (year − birthYear) / (nowYear − birthYear) × 100%`.
- Show the label above the dot and "age N" below it.
- Clicking a dot opens a drawer (motion slide-in from the right). The drawer shows the title, the yearLabel · "when he was N", the description, people and place chips, and QuoteCards.
- Below the band, list every item as a vertical card list grouped by decade, each card with `id={item.id}` for anchors.
- Under `md`, show only the vertical list. The vertical list is the mobile fallback and also the source of anchors.

### 5.3 People `/family/people` and `/family/people/[id]` (Agent C)

**List page:**

```
Everyone he *remembers*        [All 4][Family 3][Friends 1][In tree 4][Needs review 1]   [Cards|Table]
┌ Avatar PD ┐ Pepa Dvořák · childhood friend, later brother-in-law · c. 1948 · Kladno · mentioned 7× · calls 1,2 · [Suggested match]
```

- Implement chips and the Cards/Table toggle with `?filter=` and `?view=` searchParams, server side, with no client state.
- Keep `MatchCard` for pending matches, as a secondary "Needs a family member to confirm" section at the bottom.

**Detail page:**

```
Overview / People / Pepa Dvořák
[PD]  Pepa Dvořák                                   (EntityHeader)
      childhood friend, later brother-in-law · c. 1948 · Kladno · mentioned 7× in 2 calls
┌ In the family tree ─────────────────────────────────────────────┐
│ Probably Josef Dvořák (I6), b. 1948 Kladno, locksmith — Strong   │
│ given ▇▇▇▇ surname ▇▇▇▇ year ▇▇▇▇ place ▇▇▇▇                     │
│ Why: Pepa → Josef (diminutive) · …                               │
│ [Yes, that's him] [Not him]   ▸ Also considered (3)   View in tree → │
└──────────────────────────────────────────────────────────────────┘
```

- The Confirm and Reject buttons call `api.matchAction` via the existing MatchCard logic.
- For inferred people, show "Linked through Grandpa's family: {inferredReason}".
- For people with no link, show "Not found in the family tree yet. Do you know who this is?".
- Then three sections:
  - **"In grandpa's words":** QuoteCard list, from profile.quotes.
  - **"Appears in":** chapter paragraph refs ("The Boy from the Poldi Chimneys ¶4 [5]") and event chips.
  - **"Places":** chips.

### 5.4 Places `/family/places` and `/family/places/[id]` (Agent C)
- List page: stamp cards.
  - Each card has the name in Fraunces inside a CSS postmark: `rounded-full border-2 border-dashed border-brick/50`, rotated 3° on hover.
  - Below the name: the context, "mentioned N×" and the years.
- Detail page: EntityHeader with a stamp avatar, then the events at the place, the people, QuoteCards, and chapter refs.

### 5.5 Stories `/family/stories` (Agent D)
- Move the book page here and keep `ChapterView`. It is the nicest part.
- Add a topic chip row (TopicCoverage) above the chapter.
- Add a chapter meter: "5 of 5 paragraphs verified".
- Add a provenance footer: "Written by AI from calls 1–2 · {model} · {date} · every sentence links to what Grandpa actually said".
- Give each paragraph `id={p.id}` so backlinks land on it.
- Uncovered topics become dashed cards: "Love & marriage: not yet told". If a topic is the `next` one, add "Tom will ask on the next call".
- CitationChip hrefs must point to `/family/conversations/…`. Use `getChapterView(db, ch)` and its `numbered[].href`, or map the chip href.
- Keep `GenerateChapterButton` visually secondary, as a small text link at the bottom.

### 5.6 Conversations `/family/conversations` and `/family/conversations/[id]` (Agent D)

**List page:** one row per call.

```
Call 2 · 30 Sep 2026 · WhatsApp call · 6 min · 16 lines · [Childhood][Military]
"Continued: Running off with Pepa to the fair" · firstSentence · highlight quote (serif italic)
People: Pepa · Věrka
```

**Detail page:** port `app/family/sessions/[id]/page.tsx` here.
- Summary card with keyFacts, threads opened and resolved, and "Next time" plus nextSessionOpener in a speech bubble.
- Transcript bubbles:
  - Grandpa's bubbles are big serif, on `card`. Tom's bubbles are sans, on `paper-dark`, labelled "Tom (AI grandson)".
  - Each bubble has `id={turnId}` and `className="scroll-mt-28"` so the `:target` glow applies.
  - Under each grandpa bubble, show backlink chips: people, places, and "used in: The Boy from… [3]".
  - Auto-link names in the turn text with `LinkedText`.
- `app/family/sessions/[id]/page.tsx` becomes `redirect(routes.conversation(id))`.

### 5.7 Tree `/family/tree` (Agent D)
- Keep `FamilyTree`, and add a prominent "Export GEDCOM" button in the header.
- Highlight persons that have `treeStatus !== "none"` in `getPeople(db)`, including suggested and inferred, not only confirmed. Mark them brick with a "from his stories" label and link to the person page.
- Recolour PersonCard from rose/sky to paper tones: `bg-card border-line`, with brick for story people.
- Support `?focus=I6`, which selects that person on load.

## 6. Wow interactions (priority order)

1. **Citation → exact quote with glow.** Every `[n]`, QuoteCard and backlink goes to `/family/conversations/sX#sX-tNN`, and the turn glows amber for 2.4 s. Owners: A (css), D (anchors).
2. **⌘K search.** Opens with ⌘K, Ctrl-K, `/`, or the visible header pill.
   - A centered modal on `card` with a 20px autofocus input.
   - Results are grouped as People · Places · Events · Stories · Quotes · Conversations, with `<mark>` snippets.
   - ↑/↓ moves, Enter opens, Esc closes, with a hint row at the bottom.
   - An empty query shows "Try: Pepa, Kladno, 1958, verka".
   - Owner: A.
3. **Life timeline** with age labels, dashed approx dots, a "Year unknown · Tom will ask" tray, and a drawer with quotes. Owner: B.
4. **Count-up stat row plus the pulsing moss "Next call" pill.** This sells the backend engine without a button. Owner: B.
5. **Person page trust card.** Match bars, the reason, Confirm / Not him, and "In grandpa's words". Owner: C.

Bonus if time allows: a radial "Grandpa at the center" SVG on the People page.
- Grandpa sits in the middle, with nodes on a circle.
- Edge width is the mention count. Colour is brick when the person is in the tree.
- Owner: C.

## 7. Ownership (4 parallel agents)

| Agent | Owns (create/edit only these) |
|---|---|
| **A: Shell & shared** | `app/family/layout.tsx`, `app/globals.css` (append only), `components/book/FamilyNav.tsx`, `components/archive/{QuoteCard,Avatar,TreeBadge,LinkedText,EntityHeader,Chip,NextCallPill,SearchPalette,TextSizeToggle}.tsx`, `components/archive/index.ts` |
| **B: Overview & Timeline** | `app/family/page.tsx`, `app/family/timeline/page.tsx`, `components/archive/overview/*`, `components/archive/timeline/*` |
| **C: People & Places** | `app/family/people/page.tsx`, `app/family/people/[id]/page.tsx`, `app/family/places/page.tsx`, `app/family/places/[id]/page.tsx`, `components/people/*`, `components/archive/people/*`, `components/archive/places/*` |
| **D: Stories, Conversations, Tree** | `app/family/stories/page.tsx`, `app/family/book/page.tsx` (redirect), `app/family/conversations/page.tsx`, `app/family/conversations/[id]/page.tsx`, `app/family/sessions/[id]/page.tsx` (redirect), `app/family/tree/page.tsx`, `components/book/{ChapterView,CitationChip}.tsx`, `components/tree/*`, `components/archive/conversations/*` |
| Architect | `lib/archive.ts`, `tests/archive.test.ts`, this doc |

- Until A's components land, B, C and D may import from `@/components/archive` using the frozen props above. If your file needs a primitive before 16:40, build a local fallback inside your own folder rather than editing A's files.
- A imports nothing from B, C or D.
