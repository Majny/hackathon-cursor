// FROZEN CONTRACT (WP0). Zod schemas for LLM outputs (OpenAI strict structured outputs compatible):
// every field required, optional values are `.nullable()`, no min/max/regex.
import { z } from "zod";

export const LifeTopicKeySchema = z.enum(["detstvi", "skola", "vojna", "prace", "laska", "deti", "moudrost"]);

// ---- 7.2 Session summary (task "summary") ----
export const SessionSummarySchema = z.object({
  summary: z.string(),
  topicsCovered: z.array(LifeTopicKeySchema),
  newOpenThreads: z.array(
    z.object({
      title: z.string(),
      whyUnfinished: z.string(),
      turnIds: z.array(z.string()),
    }),
  ),
  resolvedThreadIds: z.array(z.string()),
  nextTopic: z.string(),
  nextSessionOpener: z.string(),
  keyFacts: z.array(z.string()),
});
export type SessionSummaryOutput = z.infer<typeof SessionSummarySchema>;

// ---- 7.3 Entity extraction (task "extract") ----
export const ExtractedPersonSchema = z.object({
  mentionName: z.string(),
  givenName: z.string().nullable(),
  surname: z.string().nullable(),
  sex: z.enum(["M", "F"]).nullable(),
  birthYear: z.number().nullable(),
  birthYearApprox: z.boolean(),
  place: z.string().nullable(),
  relationToGrandparent: z.string(),
  notes: z.string(),
  existingId: z.string().nullable(),
  turnIds: z.array(z.string()),
});
export const ExtractedPlaceSchema = z.object({
  name: z.string(),
  context: z.string(),
  turnIds: z.array(z.string()),
});
export const ExtractedEventSchema = z.object({
  title: z.string(),
  year: z.number().nullable(),
  yearApprox: z.boolean(),
  description: z.string(),
  personNames: z.array(z.string()), // mentionName of involved persons
  placeNames: z.array(z.string()),
  turnIds: z.array(z.string()),
});
export const ExtractionSchema = z.object({
  persons: z.array(ExtractedPersonSchema),
  places: z.array(ExtractedPlaceSchema),
  events: z.array(ExtractedEventSchema),
});
export type ExtractionOutput = z.infer<typeof ExtractionSchema>;

// ---- 7.4 Chapter (task "chapter") ----
export const ChapterSchema = z.object({
  title: z.string(),
  paragraphs: z.array(
    z.object({
      text: z.string(),
      citations: z.array(z.string()), // turn IDs, e.g. "s1-t07"
    }),
  ),
  openQuestions: z.array(z.string()),
});
export type ChapterOutput = z.infer<typeof ChapterSchema>;

// ---- Db (for snapshot validation, not sent to LLMs) ----
const TurnIdList = z.array(z.string());
export const DbSchema = z.object({
  version: z.literal(1),
  grandparent: z.object({
    id: z.string(), displayName: z.string(), fullName: z.string(), birthYear: z.number(),
    birthPlace: z.string(), sex: z.enum(["M", "F"]), treePersonId: z.string(), grandchildName: z.string(),
  }),
  sessions: z.array(z.object({
    id: z.string(), grandparentId: z.string(), index: z.number(), startedAt: z.string(),
    endedAt: z.string().nullable(), mode: z.enum(["voice", "text"]),
    status: z.enum(["live", "finalizing", "done", "failed"]), elConversationId: z.string().nullable(),
    firstMessage: z.string(), continuedThreadId: z.string().nullable(),
  })),
  turns: z.array(z.object({
    id: z.string(), sessionId: z.string(), idx: z.number(), clientSeq: z.number(),
    role: z.enum(["grandparent", "ai"]), text: z.string(), at: z.string(),
  })),
  summaries: z.array(SessionSummarySchema.extend({ sessionId: z.string() })),
  threads: z.array(z.object({
    id: z.string(), title: z.string(), whyUnfinished: z.string(), turnIds: TurnIdList,
    createdInSession: z.string(), resolvedInSession: z.string().nullable(), source: z.enum(["summary", "chapter"]),
  })),
  chapters: z.array(z.object({
    id: z.string(), key: LifeTopicKeySchema, title: z.string(),
    paragraphs: z.array(z.object({
      id: z.string(), text: z.string(),
      citations: z.array(z.object({ turnId: z.string(), quote: z.string() })),
      verified: z.boolean(), warnings: z.array(z.string()), editedByFamily: z.boolean(),
    })),
    openQuestions: z.array(z.string()), status: z.enum(["draft", "approved"]),
    generatedAt: z.string(), model: z.string(),
  })),
  persons: z.array(ExtractedPersonSchema.omit({ existingId: true }).extend({ id: z.string() })),
  places: z.array(ExtractedPlaceSchema.extend({ id: z.string() })),
  events: z.array(z.object({
    id: z.string(), title: z.string(), year: z.number().nullable(), yearApprox: z.boolean(),
    description: z.string(), personIds: z.array(z.string()), placeIds: z.array(z.string()), turnIds: TurnIdList,
  })),
  tree: z.object({
    name: z.string(), source: z.string(),
    persons: z.array(z.object({
      id: z.string(), givenName: z.string(), surname: z.string(), birthSurname: z.string().nullable(),
      nickname: z.string().nullable(), sex: z.enum(["M", "F"]), birthYear: z.number().nullable(),
      birthPlace: z.string().nullable(), deathYear: z.number().nullable(), occupation: z.string().nullable(),
      generation: z.number(),
    })),
    families: z.array(z.object({
      id: z.string(), husbandId: z.string().nullable(), wifeId: z.string().nullable(), childIds: z.array(z.string()),
      marriageYear: z.number().nullable(), marriagePlace: z.string().nullable(),
    })),
  }),
  matches: z.array(z.object({
    id: z.string(), entityId: z.string(), treePersonId: z.string(), score: z.number(),
    breakdown: z.object({
      given: z.number(), surname: z.number().nullable(), year: z.number().nullable(), place: z.number().nullable(),
    }),
    gates: z.array(z.string()), band: z.enum(["strong", "possible"]), reason: z.string(),
    alsoConsidered: z.array(z.object({ treePersonId: z.string(), score: z.number(), why: z.string() })),
    status: z.enum(["suggested", "confirmed", "rejected"]),
  })),
});
