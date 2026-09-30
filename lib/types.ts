// FROZEN CONTRACT (WP0). Do not edit – request changes in docs/CONTRACT_REQUESTS.md.

export type ISODate = string;
export type LifeTopicKey = "detstvi" | "skola" | "vojna" | "prace" | "laska" | "deti" | "moudrost";

export interface Grandparent {
  id: string;               // "jaroslav"
  displayName: string;      // "děda Jerry"
  fullName: string;         // "Jerry Miller"
  birthYear: number;        // 1946
  birthPlace: string;       // "Kladno"
  sex: "M" | "F";
  treePersonId: string;     // "I1"
  grandchildName: string;   // "Tomáš"
}

export interface Session {
  id: string;               // "s1", "s2"
  grandparentId: string;
  index: number;
  startedAt: ISODate; endedAt: ISODate | null;
  mode: "voice" | "text";
  status: "live" | "finalizing" | "done" | "failed";
  elConversationId: string | null;
  firstMessage: string;     // co měl agent říct jako první (pro /demo kontrolu paměti)
  continuedThreadId: string | null; // badge „navázáno na…“
}

export interface Turn {
  id: string;               // `${sessionId}-t${NN}`, např. "s1-t07" – citovatelné
  sessionId: string;
  idx: number;              // přiděleno serverem podle clientSeq
  clientSeq: number;        // monotónní z klienta; dedupe klíč
  role: "grandparent" | "ai";
  text: string;
  at: ISODate;
}

export interface OpenThread {
  id: string;               // "th-xxxx"
  title: string;            // "Útěk s Pepou na pouť do Prahy"
  whyUnfinished: string;
  turnIds: string[];
  createdInSession: string;
  resolvedInSession: string | null;
  source: "summary" | "chapter";
}

export interface SessionSummary {
  sessionId: string;
  summary: string;
  topicsCovered: LifeTopicKey[];
  newOpenThreads: Omit<OpenThread, "id" | "createdInSession" | "resolvedInSession" | "source">[];
  resolvedThreadIds: string[];
  nextTopic: string;
  nextSessionOpener: string;
  keyFacts: string[];
}

export interface Citation { turnId: string; quote: string }  // quote doplní server (prvních 160 znaků)

export interface ChapterParagraph {
  id: string;
  text: string;
  citations: Citation[];
  verified: boolean;        // false = žádná platná citace NEBO rok/jméno chybí v citovaných turnech
  warnings: string[];       // např. "Rok 1957 nezazněl v citovaných replikách"
  editedByFamily: boolean;
}

export interface Chapter {
  id: string; key: LifeTopicKey; title: string;
  paragraphs: ChapterParagraph[];
  openQuestions: string[];
  status: "draft" | "approved";
  generatedAt: ISODate; model: string;
}

export interface PersonEntity {
  id: string;
  mentionName: string;      // "Pepa Walker"
  givenName: string | null; // "Pepa" – přezdívka zůstává, převod dělá matching
  surname: string | null;
  sex: "M" | "F" | null;
  birthYear: number | null;
  birthYearApprox: boolean;
  place: string | null;
  relationToGrandparent: string;
  notes: string;
  turnIds: string[];
}
export interface PlaceEntity { id: string; name: string; context: string; turnIds: string[] }
export interface EventEntity {
  id: string; title: string; year: number | null; yearApprox: boolean;
  description: string; personIds: string[]; placeIds: string[]; turnIds: string[];
}

export interface TreePerson {
  id: string;               // "I1".."I16" = GEDCOM xref
  givenName: string; surname: string; birthSurname: string | null;
  nickname: string | null; sex: "M" | "F";
  birthYear: number | null; birthPlace: string | null; deathYear: number | null;
  occupation: string | null;
  generation: number;       // 0 = nejstarší
}
export interface TreeFamily {
  id: string; husbandId: string | null; wifeId: string | null; childIds: string[];
  marriageYear: number | null; marriagePlace: string | null;
}
export interface FamilyTree { name: string; source: string; persons: TreePerson[]; families: TreeFamily[] }

export interface Match {
  id: string;
  entityId: string;
  treePersonId: string;
  score: number;
  breakdown: { given: number; surname: number | null; year: number | null; place: number | null };
  gates: string[];          // uplatněné brány: "surname-mismatch-cap", "year-gap-cap", "no-surname-cap"
  band: "strong" | "possible";
  reason: string;
  alsoConsidered: { treePersonId: string; score: number; why: string }[];
  status: "suggested" | "confirmed" | "rejected";
}

export interface Db {
  version: 1;
  grandparent: Grandparent;
  sessions: Session[]; turns: Turn[];
  summaries: SessionSummary[]; threads: OpenThread[];
  chapters: Chapter[];
  persons: PersonEntity[]; places: PlaceEntity[]; events: EventEntity[];
  tree: FamilyTree; matches: Match[];
}

export interface MemoryContext {
  grandparentName: string; grandchildName: string; birthYear: number;
  sessionNo: number; isFirstSession: boolean;
  memorySummary: string; knownPeople: string; openThreads: string;
  nextTopic: string; uncoveredTopics: string; firstMessage: string;
  continuedThreadId: string | null;
}
