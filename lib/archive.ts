// Pure view-model selectors for the family archive (/family/*). No React, no store, no IO.
// Every page takes `const db = await getDb()` and calls one of these.
import type {
  Chapter,
  ChapterParagraph,
  Db,
  EventEntity,
  LifeTopicKey,
  Match,
  OpenThread,
  PersonEntity,
  PlaceEntity,
  Session,
  SessionSummary,
  TreePerson,
  Turn,
} from "./types";
import { LIFE_TOPICS, topicLabel } from "./topics";

// ─────────────────────────────── routes ───────────────────────────────

export const routes = {
  overview: () => "/family",
  timeline: () => "/family/timeline",
  stories: () => "/family/stories",
  story: (chapterId: string) => `/family/stories#${encodeURIComponent(chapterId)}`,
  people: () => "/family/people",
  person: (id: string) => `/family/people/${encodeURIComponent(id)}`,
  places: () => "/family/places",
  place: (id: string) => `/family/places/${encodeURIComponent(id)}`,
  conversations: () => "/family/conversations",
  conversation: (id: string) => `/family/conversations/${encodeURIComponent(id)}`,
  turn: (sessionId: string, turnId: string) =>
    `/family/conversations/${encodeURIComponent(sessionId)}#${encodeURIComponent(turnId)}`,
  event: (id: string) => `/family/timeline#${encodeURIComponent(id)}`,
  tree: (focusTreePersonId?: string) =>
    focusTreePersonId ? `/family/tree?focus=${encodeURIComponent(focusTreePersonId)}` : "/family/tree",
  gedcom: () => "/api/export/gedcom",
};

// ─────────────────────────────── small helpers ───────────────────────────────

/** Lowercase + strip diacritics ("Vera Miller" -> "verka novak"). */
export function normalizeSearch(s: string | null | undefined): string {
  return (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** 1958 -> "1958"; approx -> "c. 1948"; null -> "Year unknown". */
export function formatYear(year: number | null | undefined, approx = false): string {
  if (year == null) return "Year unknown";
  return approx ? `c. ${year}` : String(year);
}

export function ageAt(birthYear: number, year: number | null | undefined): number | null {
  if (year == null) return null;
  const a = year - birthYear;
  return a >= 0 ? a : null;
}

export function initials(name: string): string {
  const words = name.replace(/^(mum|mom|dad|sister|brother|uncle|aunt|grandma|grandpa)\s+/i, "").split(/\s+/).filter(Boolean);
  const src = words.length ? words : name.split(/\s+/);
  return src.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

const MONTHS = ["John", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Deterministic (hydration-safe, UTC) "30 Sep 2026". */
export function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function truncate(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,.;:!?\s]+$/, "")}…`;
}

function durationMin(s: Session): number | null {
  if (!s.endedAt) return null;
  const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.round(ms / 60000)) : null;
}

/** "Call 2 · 30 Sep 2026" */
export function sessionLabel(s: Pick<Session, "index" | "startedAt">): string {
  return `Call ${s.index} · ${formatDay(s.startedAt)}`;
}

function sessionIdOf(db: Db, turnId: string): string {
  const t = db.turns.find((x) => x.id === turnId);
  if (t) return t.sessionId;
  const m = /^(.+)-t\d+$/.exec(turnId);
  return m ? m[1] : "";
}

// ─────────────────────────────── quotes ───────────────────────────────

export interface QuoteRef {
  turnId: string;
  sessionId: string;
  sessionIndex: number;
  sessionDate: string;       // "30 Sep 2026"
  role: Turn["role"];
  speaker: string;           // "Grandpa Jerry" | "Tom"
  text: string;              // full turn text
  quote: string;             // ≤160 chars
  minuteIn: number | null;   // minutes since call start
  source: string;            // "Call 2 · 3 min in"
  href: string;              // /family/conversations/s2#s2-t07
}

/** Resolve a turn id to a citable quote card. Null if the turn doesn't exist. */
export function quoteForTurn(db: Db, turnId: string, max = 160): QuoteRef | null {
  const t = db.turns.find((x) => x.id === turnId);
  if (!t) return null;
  const s = db.sessions.find((x) => x.id === t.sessionId);
  const idx = s?.index ?? 0;
  let minuteIn: number | null = null;
  if (s) {
    const ms = new Date(t.at).getTime() - new Date(s.startedAt).getTime();
    if (Number.isFinite(ms) && ms >= 0) minuteIn = Math.floor(ms / 60000);
  }
  const speaker = t.role === "grandparent" ? db.grandparent.displayName : db.grandparent.grandchildName;
  return {
    turnId: t.id,
    sessionId: t.sessionId,
    sessionIndex: idx,
    sessionDate: s ? formatDay(s.startedAt) : "",
    role: t.role,
    speaker,
    text: t.text,
    quote: truncate(t.text, max),
    minuteIn,
    source: `Call ${idx}${minuteIn != null ? ` · ${minuteIn < 1 ? "first minute" : `${minuteIn} min in`}` : ""}`,
    href: routes.turn(t.sessionId, t.id),
  };
}

/** Quotes for a list of turn ids — grandparent's own words first, then call order. */
export function quotesFor(db: Db, turnIds: string[], opts: { grandparentOnly?: boolean } = {}): QuoteRef[] {
  const out: QuoteRef[] = [];
  const seen = new Set<string>();
  for (const id of turnIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const q = quoteForTurn(db, id);
    if (!q) continue;
    if (opts.grandparentOnly && q.role !== "grandparent") continue;
    out.push(q);
  }
  const order = new Map(db.turns.map((t, i) => [t.id, i]));
  return out.sort(
    (a, b) =>
      (a.role === "grandparent" ? 0 : 1) - (b.role === "grandparent" ? 0 : 1) ||
      (order.get(a.turnId) ?? 0) - (order.get(b.turnId) ?? 0),
  );
}

// ─────────────────────────────── chapters ───────────────────────────────

export interface CitedParagraph extends ChapterParagraph {
  numbered: { n: number; turnId: string; quote: string; source: string; href: string }[];
}
export interface ChapterView {
  chapter: Chapter;
  topicLabel: string;
  paragraphs: CitedParagraph[];
  verified: number;
  total: number;
  href: string;
  excerpt: string;
  sessionsUsed: number[]; // call indexes the chapter cites
}

export function getChapterView(db: Db, ch: Chapter): ChapterView {
  const numbers = new Map<string, number>();
  const sessionsUsed = new Set<number>();
  const paragraphs = ch.paragraphs.map((p) => {
    const seen = new Set<string>();
    const numbered: CitedParagraph["numbered"] = [];
    for (const c of p.citations ?? []) {
      if (!c?.turnId || seen.has(c.turnId)) continue;
      seen.add(c.turnId);
      if (!numbers.has(c.turnId)) numbers.set(c.turnId, numbers.size + 1);
      const q = quoteForTurn(db, c.turnId);
      if (q) sessionsUsed.add(q.sessionIndex);
      numbered.push({
        n: numbers.get(c.turnId)!,
        turnId: c.turnId,
        quote: c.quote?.trim() || q?.quote || "",
        source: q?.source ?? "",
        href: q?.href ?? routes.turn(sessionIdOf(db, c.turnId), c.turnId),
      });
    }
    return { ...p, numbered };
  });
  return {
    chapter: ch,
    topicLabel: topicLabel(ch.key),
    paragraphs,
    verified: ch.paragraphs.filter((p) => p.verified).length,
    total: ch.paragraphs.length,
    href: routes.story(ch.id),
    excerpt: truncate(ch.paragraphs[0]?.text ?? "", 280),
    sessionsUsed: [...sessionsUsed].sort((a, b) => a - b),
  };
}

export interface TopicCoverage {
  key: LifeTopicKey;
  label: string;
  state: "written" | "talked" | "next" | "not-yet";
  chapter?: { id: string; title: string; status: Chapter["status"]; verified: number; total: number };
  coveredInCalls: number[];
}

export function getTopicCoverage(db: Db): TopicCoverage[] {
  const next = normalizeSearch(latestSummary(db)?.nextTopic);
  return LIFE_TOPICS.map(({ key, label }) => {
    const ch = db.chapters.find((c) => c.key === key);
    const calls = db.summaries
      .filter((s) => s.topicsCovered.includes(key))
      .map((s) => db.sessions.find((x) => x.id === s.sessionId)?.index ?? 0)
      .filter(Boolean)
      .sort((a, b) => a - b);
    const state: TopicCoverage["state"] = ch
      ? "written"
      : calls.length
        ? "talked"
        : next && next.includes(normalizeSearch(label).split(" ")[0])
          ? "next"
          : "not-yet";
    return {
      key,
      label,
      state,
      chapter: ch
        ? { id: ch.id, title: ch.title, status: ch.status, verified: ch.paragraphs.filter((p) => p.verified).length, total: ch.paragraphs.length }
        : undefined,
      coveredInCalls: calls,
    };
  });
}

// ─────────────────────────────── threads ───────────────────────────────

export interface ThreadView {
  thread: OpenThread;
  status: "open" | "resolved";
  openedInCall: number | null;
  resolvedInCall: number | null;
  quotes: QuoteRef[];
}

export function getThreads(db: Db): ThreadView[] {
  const idx = (sid: string | null) => (sid ? (db.sessions.find((s) => s.id === sid)?.index ?? null) : null);
  return db.threads
    .map((t) => ({
      thread: t,
      status: (t.resolvedInSession ? "resolved" : "open") as ThreadView["status"],
      openedInCall: idx(t.createdInSession),
      resolvedInCall: idx(t.resolvedInSession),
      quotes: quotesFor(db, t.turnIds),
    }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "open" ? -1 : 1));
}

function latestSession(db: Db): Session | null {
  return [...db.sessions].sort((a, b) => b.index - a.index)[0] ?? null;
}
function latestSummary(db: Db): SessionSummary | null {
  const s = [...db.sessions].sort((a, b) => b.index - a.index);
  for (const x of s) {
    const sum = db.summaries.find((y) => y.sessionId === x.id);
    if (sum) return sum;
  }
  return db.summaries[db.summaries.length - 1] ?? null;
}

// ─────────────────────────────── people ───────────────────────────────

export type TreeLinkStatus = "confirmed" | "suggested" | "inferred" | "none";

export interface PersonCardVM {
  id: string;
  name: string;
  initials: string;
  relation: string;
  group: "family" | "friends";
  years: string;            // "c. 1948" | ""
  place: string | null;
  mentionCount: number;
  callsMentioned: number[];
  treeStatus: TreeLinkStatus;
  treePerson: TreePerson | null;
  href: string;
}

export interface PersonProfile extends PersonCardVM {
  entity: PersonEntity;
  notes: string;
  match: Match | null;                 // non-rejected match (if any)
  matchTreePerson: TreePerson | null;
  alsoConsidered: { treePerson: TreePerson | null; score: number; why: string }[];
  inferredReason: string | null;       // when treeStatus === "inferred"
  quotes: QuoteRef[];                  // grandparent's words first
  firstMentioned: QuoteRef | null;
  events: { id: string; title: string; year: string; href: string }[];
  places: { id: string; name: string; href: string }[];
  chapterRefs: { chapterId: string; title: string; paragraphId: string; n: number; href: string }[];
  treeHref: string | null;
}

const FAMILY_RE = /\b(mum|mom|mother|dad|father|sister|brother|wife|husband|son|daughter|grand|uncle|aunt|cousin|in-law|brother-in-law)\b/i;

/** Links an entity to the tree through the grandparent's own family (mum/dad/sister/...) when no match exists. */
function inferTreePerson(db: Db, p: PersonEntity): { tp: TreePerson; why: string } | null {
  const me = db.grandparent.treePersonId;
  const byId = new Map(db.tree.persons.map((x) => [x.id, x]));
  const rel = p.relationToGrandparent.toLowerCase() + " " + p.mentionName.toLowerCase();
  const parents = db.tree.families.find((f) => f.childIds.includes(me));
  const given = normalizeSearch(p.givenName ?? p.mentionName.split(/\s+/).pop());
  const pick = (id: string | null | undefined, why: string) => {
    const tp = id ? byId.get(id) : undefined;
    return tp ? { tp, why } : null;
  };
  if (parents) {
    if (/\b(mum|mom|mother)\b/.test(rel)) return pick(parents.wifeId, "Grandpa's mother in the tree");
    if (/\b(dad|father)\b/.test(rel)) return pick(parents.husbandId, "Grandpa's father in the tree");
    if (/\b(sister|brother)\b/.test(rel) && !/in-law/.test(rel)) {
      const sex = /sister/.test(rel) ? "F" : "M";
      const sibs = parents.childIds.map((c) => byId.get(c)).filter((x): x is TreePerson => !!x && x.id !== me && x.sex === sex);
      const best =
        sibs.find((s) => { const g = normalizeSearch(s.givenName); return g.slice(0, 3) === given.slice(0, 3); }) ??
        (sibs.length === 1 ? sibs[0] : undefined);
      if (best) return { tp: best, why: `Grandpa's ${sex === "F" ? "sister" : "brother"} in the tree` };
    }
  }
  const spouseFam = db.tree.families.find((f) => f.husbandId === me || f.wifeId === me);
  if (spouseFam && /\b(wife|husband)\b/.test(rel)) {
    return pick(spouseFam.husbandId === me ? spouseFam.wifeId : spouseFam.husbandId, "Grandpa's spouse in the tree");
  }
  return null;
}

function personTreeLink(db: Db, p: PersonEntity) {
  const byId = new Map(db.tree.persons.map((x) => [x.id, x]));
  const matches = db.matches.filter((m) => m.entityId === p.id && m.status !== "rejected");
  const match = matches.find((m) => m.status === "confirmed") ?? matches.sort((a, b) => b.score - a.score)[0] ?? null;
  if (match) {
    return {
      match,
      treePerson: byId.get(match.treePersonId) ?? null,
      status: match.status as TreeLinkStatus,
      inferredReason: null as string | null,
    };
  }
  const inf = inferTreePerson(db, p);
  if (inf) return { match: null, treePerson: inf.tp, status: "inferred" as TreeLinkStatus, inferredReason: inf.why };
  return { match: null, treePerson: null, status: "none" as TreeLinkStatus, inferredReason: null };
}

function callsFor(db: Db, turnIds: string[]): number[] {
  const set = new Set<number>();
  for (const id of turnIds) {
    const s = db.sessions.find((x) => x.id === sessionIdOf(db, id));
    if (s) set.add(s.index);
  }
  return [...set].sort((a, b) => a - b);
}

function personCard(db: Db, p: PersonEntity): PersonCardVM {
  const link = personTreeLink(db, p);
  return {
    id: p.id,
    name: p.mentionName,
    initials: initials(p.mentionName),
    relation: p.relationToGrandparent,
    group: FAMILY_RE.test(p.relationToGrandparent) || FAMILY_RE.test(p.mentionName) ? "family" : "friends",
    years: p.birthYear != null ? formatYear(p.birthYear, p.birthYearApprox) : "",
    place: p.place,
    mentionCount: new Set(p.turnIds).size,
    callsMentioned: callsFor(db, p.turnIds),
    treeStatus: link.status,
    treePerson: link.treePerson,
    href: routes.person(p.id),
  };
}

/** People list, most-mentioned first. */
export function getPeople(db: Db): PersonCardVM[] {
  return db.persons.map((p) => personCard(db, p)).sort((a, b) => b.mentionCount - a.mentionCount || a.name.localeCompare(b.name));
}

function chapterRefsFor(db: Db, turnIds: string[]): PersonProfile["chapterRefs"] {
  const set = new Set(turnIds);
  const out: PersonProfile["chapterRefs"] = [];
  for (const ch of db.chapters) {
    const view = getChapterView(db, ch);
    for (const p of view.paragraphs) {
      const hit = p.numbered.find((c) => set.has(c.turnId));
      if (hit) out.push({ chapterId: ch.id, title: ch.title, paragraphId: p.id, n: hit.n, href: `${routes.stories()}#${encodeURIComponent(p.id)}` });
    }
  }
  return out;
}

export function getPersonProfile(db: Db, id: string): PersonProfile | null {
  const p = db.persons.find((x) => x.id === id);
  if (!p) return null;
  const card = personCard(db, p);
  const link = personTreeLink(db, p);
  const byId = new Map(db.tree.persons.map((x) => [x.id, x]));
  const quotes = quotesFor(db, p.turnIds);
  const order = new Map(db.turns.map((t, i) => [t.id, i]));
  const first = [...quotes].sort((a, b) => (order.get(a.turnId) ?? 0) - (order.get(b.turnId) ?? 0))[0] ?? null;
  const events = db.events.filter((e) => e.personIds.includes(p.id));
  const placeIds = new Set(events.flatMap((e) => e.placeIds));
  const pn = normalizeSearch(p.place);
  for (const pl of db.places) if (pn && normalizeSearch(pl.name) === pn) placeIds.add(pl.id);
  return {
    ...card,
    entity: p,
    notes: p.notes,
    match: link.match,
    matchTreePerson: link.match ? (byId.get(link.match.treePersonId) ?? null) : null,
    alsoConsidered: (link.match?.alsoConsidered ?? []).map((a) => ({ treePerson: byId.get(a.treePersonId) ?? null, score: a.score, why: a.why })),
    inferredReason: link.inferredReason,
    quotes,
    firstMentioned: first,
    events: sortEvents(events).map((e) => ({ id: e.id, title: e.title, year: formatYear(e.year, e.yearApprox), href: routes.event(e.id) })),
    places: db.places.filter((pl) => placeIds.has(pl.id)).map((pl) => ({ id: pl.id, name: pl.name, href: routes.place(pl.id) })),
    chapterRefs: chapterRefsFor(db, p.turnIds),
    treeHref: link.treePerson ? routes.tree(link.treePerson.id) : null,
  };
}

// ─────────────────────────────── places ───────────────────────────────

export interface PlaceCardVM {
  id: string;
  name: string;
  context: string;
  mentionCount: number;
  years: number[];
  eventCount: number;
  href: string;
}
export interface PlaceProfile extends PlaceCardVM {
  place: PlaceEntity;
  quotes: QuoteRef[];
  events: { id: string; title: string; year: string; href: string }[];
  people: { id: string; name: string; href: string }[];
  chapterRefs: PersonProfile["chapterRefs"];
}

function placeCard(db: Db, pl: PlaceEntity): PlaceCardVM {
  const evs = db.events.filter((e) => e.placeIds.includes(pl.id));
  const years = [...new Set(evs.map((e) => e.year).filter((y): y is number => y != null))].sort((a, b) => a - b);
  return { id: pl.id, name: pl.name, context: pl.context, mentionCount: new Set(pl.turnIds).size, years, eventCount: evs.length, href: routes.place(pl.id) };
}

export function getPlaces(db: Db): PlaceCardVM[] {
  return db.places.map((pl) => placeCard(db, pl)).sort((a, b) => b.mentionCount - a.mentionCount || a.name.localeCompare(b.name));
}

export function getPlaceProfile(db: Db, id: string): PlaceProfile | null {
  const pl = db.places.find((x) => x.id === id);
  if (!pl) return null;
  const evs = db.events.filter((e) => e.placeIds.includes(pl.id));
  const personIds = new Set(evs.flatMap((e) => e.personIds));
  const n = normalizeSearch(pl.name);
  for (const p of db.persons) if (normalizeSearch(p.place) === n) personIds.add(p.id);
  return {
    ...placeCard(db, pl),
    place: pl,
    quotes: quotesFor(db, pl.turnIds),
    events: sortEvents(evs).map((e) => ({ id: e.id, title: e.title, year: formatYear(e.year, e.yearApprox), href: routes.event(e.id) })),
    people: db.persons.filter((p) => personIds.has(p.id)).map((p) => ({ id: p.id, name: p.mentionName, href: routes.person(p.id) })),
    chapterRefs: chapterRefsFor(db, pl.turnIds),
  };
}

// ─────────────────────────────── timeline ───────────────────────────────

function sortEvents(evs: EventEntity[]): EventEntity[] {
  return [...evs].sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.title.localeCompare(b.title));
}

export interface TimelineItem {
  id: string;                  // anchor id (event id, "tree-F3", "call-s2", "thread-th-vojna")
  year: number | null;
  approx: boolean;
  yearLabel: string;           // "1958" | "c. 1972" | "Year unknown"
  age: number | null;          // grandpa's age that year
  title: string;
  description: string;
  kind: "birth" | "event" | "tree" | "call" | "not-yet-told";
  source: "story" | "tree" | "archive";
  people: { id: string; name: string; href: string }[];
  places: { id: string; name: string; href: string }[];
  quotes: QuoteRef[];
  href: string | null;
}

export interface LifeStage { label: string; from: number; to: number }

/** Background bands for the timeline, derived from birth year. */
export function lifeStageBands(birthYear: number, nowYear: number): LifeStage[] {
  const raw: [string, number, number][] = [
    ["Childhood", 0, 12],
    ["School & apprenticeship", 12, 19],
    ["Military service", 19, 21],
    ["Work & family", 21, 60],
    ["Retirement", 60, 200],
  ];
  return raw
    .map(([label, a, b]) => ({ label, from: birthYear + a, to: Math.min(birthYear + b, nowYear) }))
    .filter((s) => s.from < nowYear && s.to > s.from);
}

export interface Timeline {
  birthYear: number;
  nowYear: number;
  items: TimelineItem[];       // dated, sorted ascending (story + tree + calls + ghosts)
  undated: TimelineItem[];     // "Year unknown — Tom will ask"
  stages: LifeStage[];
  decades: number[];           // tick marks, e.g. [1950, 1960, ...]
}

export function getTimeline(db: Db, opts: { includeTree?: boolean; includeCalls?: boolean; nowYear?: number } = {}): Timeline {
  const { includeTree = true, includeCalls = true } = opts;
  const gp = db.grandparent;
  const lastCall = latestSession(db);
  const nowYear = opts.nowYear ?? (lastCall ? new Date(lastCall.startedAt).getUTCFullYear() : 2026);
  const peopleRef = (ids: string[]) =>
    ids.map((id) => db.persons.find((p) => p.id === id)).filter((p): p is PersonEntity => !!p).map((p) => ({ id: p.id, name: p.mentionName, href: routes.person(p.id) }));
  const placeRef = (ids: string[]) =>
    ids.map((id) => db.places.find((p) => p.id === id)).filter((p): p is PlaceEntity => !!p).map((p) => ({ id: p.id, name: p.name, href: routes.place(p.id) }));

  const items: TimelineItem[] = [];
  const undated: TimelineItem[] = [];
  const byId = new Map(db.tree.persons.map((x) => [x.id, x]));
  const treeName = (id: string | null) => (id ? byId.get(id) : undefined);
  const usedTreeFamilies = new Set<string>();

  const hasBirth = db.events.some((e) => e.year === gp.birthYear && /born|birth/i.test(e.title));
  if (!hasBirth) {
    items.push({
      id: "birth", year: gp.birthYear, approx: false, yearLabel: String(gp.birthYear), age: 0,
      title: `${gp.fullName.split(" ")[0]} is born`, description: `Born in ${gp.birthPlace}.`,
      kind: "birth", source: "archive", people: [], places: placeRef(db.places.filter((p) => normalizeSearch(p.name) === normalizeSearch(gp.birthPlace)).map((p) => p.id)),
      quotes: [], href: null,
    });
  }

  for (const e of db.events) {
    let year = e.year;
    let approx = e.yearApprox;
    let description = e.description;
    // Enrich an undated wedding from the tree (e.g. Pepa marries Vera -> F3 1972).
    if (year == null && includeTree && /marr|wedding/i.test(e.title)) {
      const treeIds = e.personIds
        .map((pid) => db.persons.find((p) => p.id === pid))
        .filter((p): p is PersonEntity => !!p)
        .map((p) => personTreeLink(db, p).treePerson?.id)
        .filter((x): x is string => !!x);
      const fam = db.tree.families.find(
        (f) => f.marriageYear != null && treeIds.length >= 2 && treeIds.every((t) => t === f.husbandId || t === f.wifeId),
      );
      if (fam) {
        year = fam.marriageYear;
        approx = true;
        description = `${description} (Year from the family tree.)`;
        usedTreeFamilies.add(fam.id);
      }
    }
    const item: TimelineItem = {
      id: e.id, year, approx, yearLabel: formatYear(year, approx), age: ageAt(gp.birthYear, year),
      title: e.title, description, kind: /born|birth/i.test(e.title) ? "birth" : "event", source: "story",
      people: peopleRef(e.personIds), places: placeRef(e.placeIds), quotes: quotesFor(db, e.turnIds, { grandparentOnly: true }),
      href: routes.event(e.id),
    };
    (year == null ? undated : items).push(item);
  }

  if (includeTree) {
    const me = gp.treePersonId;
    for (const f of db.tree.families) {
      if (f.marriageYear == null || usedTreeFamilies.has(f.id)) continue;
      if (f.husbandId !== me && f.wifeId !== me) continue; // only grandpa's own marriage
      const spouse = treeName(f.husbandId === me ? f.wifeId : f.husbandId);
      items.push({
        id: `tree-${f.id}`, year: f.marriageYear, approx: false, yearLabel: String(f.marriageYear), age: ageAt(gp.birthYear, f.marriageYear),
        title: spouse ? `Marries ${spouse.givenName}` : "Marriage", description: `From the family tree${f.marriagePlace ? ` · ${f.marriagePlace}` : ""}. Not yet told in his own words.`,
        kind: "tree", source: "tree", people: [], places: [], quotes: [], href: routes.tree(me),
      });
    }
  }

  // "Not yet told" ghosts from open threads.
  for (const t of db.threads.filter((x) => !x.resolvedInSession)) {
    const linked = db.events.find((e) => e.turnIds.some((id) => t.turnIds.includes(id)));
    if (linked) continue; // already on the timeline as a real event
    const m = /\b(19\d\d|20\d\d)\b/.exec(`${t.title} ${t.whyUnfinished}`);
    const y = m ? Number(m[1]) : null;
    const item: TimelineItem = {
      id: `thread-${t.id}`, year: y, approx: true, yearLabel: formatYear(y, true), age: ageAt(gp.birthYear, y),
      title: t.title, description: t.whyUnfinished, kind: "not-yet-told", source: "archive", people: [], places: [],
      quotes: quotesFor(db, t.turnIds, { grandparentOnly: true }), href: null,
    };
    (y == null ? undated : items).push(item);
  }

  if (includeCalls) {
    for (const s of db.sessions) {
      const y = new Date(s.startedAt).getUTCFullYear();
      items.push({
        id: `call-${s.id}`, year: y, approx: false, yearLabel: String(y), age: ageAt(gp.birthYear, y),
        title: `Call ${s.index} with ${gp.grandchildName}`, description: truncate(db.summaries.find((x) => x.sessionId === s.id)?.summary ?? "", 140),
        kind: "call", source: "archive", people: [], places: [], quotes: [], href: routes.conversation(s.id),
      });
    }
  }

  const kindOrder: Record<TimelineItem["kind"], number> = { birth: 0, event: 1, tree: 2, "not-yet-told": 3, call: 4 };
  items.sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || kindOrder[a.kind] - kindOrder[b.kind] || a.title.localeCompare(b.title));
  const decades: number[] = [];
  for (let d = Math.ceil(gp.birthYear / 10) * 10; d <= nowYear; d += 10) decades.push(d);
  return { birthYear: gp.birthYear, nowYear, items, undated, stages: lifeStageBands(gp.birthYear, nowYear), decades };
}

// ─────────────────────────────── conversations ───────────────────────────────

export interface ConversationCardVM {
  id: string;
  index: number;
  title: string;               // "Call 2"
  date: string;                // "30 Sep 2026"
  channel: string;             // "WhatsApp call"
  durationMin: number | null;
  lineCount: number;
  grandparentLines: number;
  topics: { key: LifeTopicKey; label: string }[];
  summary: string;
  firstSentence: string;
  keyFacts: string[];
  continuedThread: { id: string; title: string } | null;
  openedThreads: { id: string; title: string }[];
  resolvedThreads: { id: string; title: string }[];
  people: { id: string; name: string; href: string }[];
  highlight: QuoteRef | null;  // longest grandparent line
  href: string;
}

export interface ConversationDetail extends ConversationCardVM {
  session: Session;
  nextTopic: string | null;
  nextSessionOpener: string | null;
  turns: (QuoteRef & {
    people: { id: string; name: string; href: string }[];
    places: { id: string; name: string; href: string }[];
    chapterRefs: { chapterId: string; title: string; n: number; href: string }[];
  })[];
}

function conversationCard(db: Db, s: Session): ConversationCardVM {
  const sum = db.summaries.find((x) => x.sessionId === s.id);
  const turns = db.turns.filter((t) => t.sessionId === s.id).sort((a, b) => a.idx - b.idx);
  const ids = new Set(turns.map((t) => t.id));
  const gpTurns = turns.filter((t) => t.role === "grandparent");
  const longest = [...gpTurns].sort((a, b) => b.text.length - a.text.length)[0];
  const thread = (id: string) => db.threads.find((t) => t.id === id);
  const summary = sum?.summary ?? "";
  return {
    id: s.id,
    index: s.index,
    title: `Call ${s.index}`,
    date: formatDay(s.startedAt),
    channel: s.mode === "voice" ? "WhatsApp call" : "Text chat",
    durationMin: durationMin(s),
    lineCount: turns.length,
    grandparentLines: gpTurns.length,
    topics: (sum?.topicsCovered ?? []).map((k) => ({ key: k, label: topicLabel(k) })),
    summary,
    firstSentence: (/^.*?[.!?](\s|$)/.exec(summary)?.[0] ?? summary).trim(),
    keyFacts: sum?.keyFacts ?? [],
    continuedThread: s.continuedThreadId && thread(s.continuedThreadId) ? { id: s.continuedThreadId, title: thread(s.continuedThreadId)!.title } : null,
    openedThreads: db.threads.filter((t) => t.createdInSession === s.id).map((t) => ({ id: t.id, title: t.title })),
    resolvedThreads: db.threads.filter((t) => t.resolvedInSession === s.id).map((t) => ({ id: t.id, title: t.title })),
    people: db.persons.filter((p) => p.turnIds.some((id) => ids.has(id))).map((p) => ({ id: p.id, name: p.mentionName, href: routes.person(p.id) })),
    highlight: longest ? quoteForTurn(db, longest.id, 220) : null,
    href: routes.conversation(s.id),
  };
}

/** Newest first. */
export function getConversations(db: Db): ConversationCardVM[] {
  return [...db.sessions].sort((a, b) => b.index - a.index).map((s) => conversationCard(db, s));
}

export function getConversation(db: Db, id: string): ConversationDetail | null {
  const s = db.sessions.find((x) => x.id === id);
  if (!s) return null;
  const sum = db.summaries.find((x) => x.sessionId === s.id);
  const chapterViews = db.chapters.map((c) => getChapterView(db, c));
  const turns = db.turns
    .filter((t) => t.sessionId === s.id)
    .sort((a, b) => a.idx - b.idx)
    .map((t) => {
      const q = quoteForTurn(db, t.id, 10_000)!;
      const chapterRefs: ConversationDetail["turns"][number]["chapterRefs"] = [];
      for (const v of chapterViews) {
        for (const p of v.paragraphs) {
          const hit = p.numbered.find((c) => c.turnId === t.id);
          if (hit) chapterRefs.push({ chapterId: v.chapter.id, title: v.chapter.title, n: hit.n, href: `${routes.stories()}#${encodeURIComponent(p.id)}` });
        }
      }
      return {
        ...q,
        people: db.persons.filter((p) => p.turnIds.includes(t.id)).map((p) => ({ id: p.id, name: p.mentionName, href: routes.person(p.id) })),
        places: db.places.filter((p) => p.turnIds.includes(t.id)).map((p) => ({ id: p.id, name: p.name, href: routes.place(p.id) })),
        chapterRefs,
      };
    });
  return { ...conversationCard(db, s), session: s, nextTopic: sum?.nextTopic ?? null, nextSessionOpener: sum?.nextSessionOpener ?? null, turns };
}

// ─────────────────────────────── overview ───────────────────────────────

export interface ArchiveStats {
  conversations: number;
  minutesRecorded: number;
  grandparentLines: number;
  words: number;
  people: number;
  places: number;
  events: number;
  chapters: number;
  verifiedParagraphs: number;
  totalParagraphs: number;
  openThreads: number;
  linkedToTree: number;
}

export interface Overview {
  grandparent: Db["grandparent"];
  title: string;                      // "Grandpa Jerry's story"
  stats: ArchiveStats;
  latestConversation: ConversationCardVM | null;
  nextCall: { topic: string; opener: string | null; threadId: string | null; whyUnfinished: string | null } | null;
  openThreads: ThreadView[];
  resolvedThreads: ThreadView[];
  pendingMatches: { match: Match; person: PersonEntity | null; treePerson: TreePerson | null; href: string }[];
  latestChapter: ChapterView | null;
  topics: TopicCoverage[];
  people: PersonCardVM[];
  featuredQuote: QuoteRef | null;
  quotes: QuoteRef[];                 // pull-quote carousel candidates
}

export function getStats(db: Db): ArchiveStats {
  const gp = db.turns.filter((t) => t.role === "grandparent");
  const paragraphs = db.chapters.flatMap((c) => c.paragraphs);
  return {
    conversations: db.sessions.length,
    minutesRecorded: db.sessions.reduce((n, s) => n + (durationMin(s) ?? 0), 0),
    grandparentLines: gp.length,
    words: gp.reduce((n, t) => n + t.text.split(/\s+/).filter(Boolean).length, 0),
    people: db.persons.length,
    places: db.places.length,
    events: db.events.length,
    chapters: db.chapters.length,
    verifiedParagraphs: paragraphs.filter((p) => p.verified).length,
    totalParagraphs: paragraphs.length,
    openThreads: db.threads.filter((t) => !t.resolvedInSession).length,
    linkedToTree: db.persons.filter((p) => personTreeLink(db, p).status !== "none").length,
  };
}

/** Grandparent lines that read well as pull-quotes (mid-length, first-person). */
export function pullQuotes(db: Db, limit = 6): QuoteRef[] {
  return db.turns
    .filter((t) => t.role === "grandparent" && t.text.length >= 80)
    .map((t) => ({ t, score: Math.abs(t.text.length - 180) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ t }) => quoteForTurn(db, t.id, 240)!)
    .sort((a, b) => a.sessionIndex - b.sessionIndex || a.turnId.localeCompare(b.turnId));
}

export function getOverview(db: Db): Overview {
  const gp = db.grandparent;
  const threads = getThreads(db);
  const open = threads.filter((t) => t.status === "open");
  const sum = latestSummary(db);
  const conv = getConversations(db);
  const chapters = [...db.chapters].sort((a, b) => (b.generatedAt ?? "").localeCompare(a.generatedAt ?? ""));
  const byId = new Map(db.tree.persons.map((x) => [x.id, x]));
  const quotes = pullQuotes(db);
  const nextCall =
    sum || open.length
      ? {
          topic: sum?.nextTopic || open[0]?.thread.title || "",
          opener: sum?.nextSessionOpener ?? null,
          threadId: open[0]?.thread.id ?? null,
          whyUnfinished: open[0]?.thread.whyUnfinished ?? null,
        }
      : null;
  return {
    grandparent: gp,
    title: `${gp.displayName}'s story`,
    stats: getStats(db),
    latestConversation: conv[0] ?? null,
    nextCall,
    openThreads: open,
    resolvedThreads: threads.filter((t) => t.status === "resolved"),
    pendingMatches: db.matches
      .filter((m) => m.status === "suggested")
      .map((m) => ({ match: m, person: db.persons.find((p) => p.id === m.entityId) ?? null, treePerson: byId.get(m.treePersonId) ?? null, href: routes.person(m.entityId) })),
    latestChapter: chapters[0] ? getChapterView(db, chapters[0]) : null,
    topics: getTopicCoverage(db),
    people: getPeople(db),
    featuredQuote: quotes[0] ?? null,
    quotes,
  };
}

// ─────────────────────────────── search ───────────────────────────────

export type SearchKind = "person" | "place" | "event" | "chapter" | "quote" | "conversation";

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  text: string;      // searchable body (original casing, for snippets)
  href: string;
  year?: number | null;
}

/** Flat index (~60 docs for the demo) — serialise to the client Cmd-K component. */
export function buildSearchIndex(db: Db): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const p of getPeople(db)) {
    const e = db.persons.find((x) => x.id === p.id)!;
    docs.push({
      id: `person:${p.id}`, kind: "person", title: p.name,
      subtitle: [p.relation, p.years, `mentioned ${p.mentionCount}×`].filter(Boolean).join(" · "),
      text: [e.mentionName, e.givenName, e.surname, e.relationToGrandparent, e.place, e.notes, p.treePerson ? `${p.treePerson.givenName} ${p.treePerson.surname}` : ""].filter(Boolean).join(" "),
      href: p.href, year: e.birthYear,
    });
  }
  for (const pl of db.places) {
    docs.push({ id: `place:${pl.id}`, kind: "place", title: pl.name, subtitle: pl.context, text: `${pl.name} ${pl.context}`, href: routes.place(pl.id) });
  }
  for (const e of db.events) {
    docs.push({
      id: `event:${e.id}`, kind: "event", title: e.title, subtitle: formatYear(e.year, e.yearApprox),
      text: `${e.title} ${e.year ?? ""} ${e.description}`, href: routes.event(e.id), year: e.year,
    });
  }
  for (const ch of db.chapters) {
    docs.push({ id: `chapter:${ch.id}`, kind: "chapter", title: ch.title, subtitle: `${topicLabel(ch.key)} · ${ch.paragraphs.length} paragraphs`, text: ch.title, href: routes.story(ch.id) });
    ch.paragraphs.forEach((p, i) => {
      docs.push({ id: `chapter:${ch.id}:${p.id}`, kind: "chapter", title: ch.title, subtitle: `Paragraph ${i + 1}`, text: p.text, href: `${routes.stories()}#${encodeURIComponent(p.id)}` });
    });
  }
  for (const t of db.turns.filter((x) => x.role === "grandparent")) {
    const q = quoteForTurn(db, t.id)!;
    docs.push({ id: `quote:${t.id}`, kind: "quote", title: q.quote, subtitle: `${q.speaker} · ${q.source}`, text: t.text, href: q.href });
  }
  for (const c of getConversations(db)) {
    docs.push({
      id: `conversation:${c.id}`, kind: "conversation", title: `${c.title} · ${c.date}`, subtitle: c.topics.map((t) => t.label).join(", ") || c.channel,
      text: `${c.title} ${c.summary} ${c.keyFacts.join(" ")}`, href: c.href,
    });
  }
  return docs;
}

export interface SearchHit extends SearchDoc {
  score: number;
  snippet: { before: string; match: string; after: string } | null;
}

/** Diacritic-insensitive search; title startsWith > title includes > body includes. Max `perKind` per kind. */
export function searchDocs(docs: SearchDoc[], query: string, perKind = 5): SearchHit[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const d of docs) {
    const title = normalizeSearch(d.title);
    const body = normalizeSearch(d.text);
    let score = 0;
    if (title.startsWith(q)) score = 3;
    else if (title.split(" ").some((w) => w.startsWith(q))) score = 2.5;
    else if (title.includes(q)) score = 2;
    else if (body.includes(q)) score = 1;
    else if (normalizeSearch(d.subtitle).includes(q)) score = 0.5;
    if (!score) continue;
    hits.push({ ...d, score, snippet: snippetFor(d.text, query) });
  }
  const kindRank: Record<SearchKind, number> = { person: 0, place: 1, event: 2, chapter: 3, quote: 4, conversation: 5 };
  hits.sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || b.score - a.score);
  const count = new Map<SearchKind, number>();
  return hits.filter((h) => {
    const n = count.get(h.kind) ?? 0;
    count.set(h.kind, n + 1);
    return n < perKind;
  });
}

/** Snippet around the first match, indices mapped back to the original (accented) text. */
export function snippetFor(text: string, query: string, radius = 50): SearchHit["snippet"] {
  const q = normalizeSearch(query);
  if (!q) return null;
  // Per-character normalisation keeps indices aligned with the original string.
  const chars = [...text];
  const normChars = chars.map((c) => c.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() || c);
  const joined = normChars.join("");
  const at = joined.indexOf(q);
  if (at < 0) return null;
  // map normalised offset -> char index
  let acc = 0, start = -1, end = -1;
  for (let i = 0; i < normChars.length; i++) {
    if (start < 0 && acc >= at) start = i;
    acc += normChars[i].length;
    if (start >= 0 && acc >= at + q.length) { end = i + 1; break; }
  }
  if (start < 0 || end < 0) return null;
  const from = Math.max(0, start - radius);
  const to = Math.min(chars.length, end + radius);
  return {
    before: (from > 0 ? "…" : "") + chars.slice(from, start).join(""),
    match: chars.slice(start, end).join(""),
    after: chars.slice(end, to).join("") + (to < chars.length ? "…" : ""),
  };
}

// ─────────────────────────────── auto-linking ───────────────────────────────

export interface EntityLink { term: string; href: string; kind: "person" | "place"; id: string }

/** Terms to auto-link inside prose (longest first). Feed to a <LinkedText> component. */
export function entityLinkTerms(db: Db): EntityLink[] {
  const out: EntityLink[] = [];
  const add = (term: string | null | undefined, href: string, kind: EntityLink["kind"], id: string) => {
    const t = term?.trim();
    if (t && t.length >= 3 && !out.some((o) => o.term === t)) out.push({ term: t, href, kind, id });
  };
  for (const p of db.persons) {
    add(p.mentionName, routes.person(p.id), "person", p.id);
    add(p.givenName, routes.person(p.id), "person", p.id);
  }
  for (const pl of db.places) add(pl.name, routes.place(pl.id), "place", pl.id);
  return out.sort((a, b) => b.term.length - a.term.length);
}

export type TextPart = { text: string; link?: EntityLink };

/** Split text into plain / linked parts (first occurrence of each entity only, whole words, diacritic-sensitive). */
export function linkEntities(text: string, links: EntityLink[], opts: { everyOccurrence?: boolean } = {}): TextPart[] {
  if (!links.length || !text) return [{ text }];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}])(${links.map((l) => esc(l.term)).join("|")})(?![\\p{L}])`, "gu");
  const parts: TextPart[] = [];
  const used = new Set<string>();
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const link = links.find((l) => l.term === m![1])!;
    if (!opts.everyOccurrence && used.has(link.id)) continue;
    used.add(link.id);
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[1], link });
    last = m.index + m[1].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
