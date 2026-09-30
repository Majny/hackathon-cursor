// Typed fetch wrappers for client components (PLAN §6). Works in browser (relative URLs).
import type {
  Chapter, EventEntity, FamilyTree, LifeTopicKey, Match, MemoryContext, OpenThread, PersonEntity,
  PlaceEntity, Session, SessionSummary, Turn, Citation,
} from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: unknown) {
    super(message);
  }
}

async function req<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, (body as { error?: string } | null)?.error ?? res.statusText, body);
  }
  return (await res.json()) as T;
}

export interface HealthResponse {
  openai: boolean; gemini: boolean; elevenlabs: boolean; supabase: boolean;
  store: "file" | "supabase"; stateId: string; mockAi: boolean; llmProvider: string;
  models: { openai: string; openaiWriter: string; gemini: string };
}
export interface StartSessionResponse {
  session: Session; memory: MemoryContext; dynamicVariables: Record<string, string>; conversationToken: string | null;
}
export interface SessionDetailResponse { session: Session; turns: Turn[]; summary: SessionSummary | null }
export interface FinalizeResponse {
  summary: SessionSummary; threads: OpenThread[]; persons: PersonEntity[]; matches: Match[];
  chapter?: Chapter; nextTopic: string;
}
export interface FinalizeErrorBody { error: string; fallbackSnapshot: "after-s2" }
export interface MemoryResponse { memory: MemoryContext; dynamicVariables: Record<string, string>; systemPrompt: string }
export interface ChatResponse { reply: string; turns: Turn[] }
export interface EntitiesResponse { persons: PersonEntity[]; places: PlaceEntity[]; events: EventEntity[] }
export interface TreeResponse {
  tree: FamilyTree; matches: Match[];
  confirmedByTreeId: Record<string, { entity: PersonEntity; citations: Citation[] }>;
}
export type SnapshotName = "empty" | "after-s1" | "after-s2";

export const api = {
  health: () => req<HealthResponse>("/api/health"),
  startSession: (mode: "voice" | "text") => req<StartSessionResponse>("/api/sessions", { method: "POST", json: { mode } }),
  listSessions: () => req<Session[]>("/api/sessions"),
  getSession: (id: string) => req<SessionDetailResponse>(`/api/sessions/${encodeURIComponent(id)}`),
  setConversationId: (id: string, elConversationId: string) =>
    req<{ session: Session }>(`/api/sessions/${encodeURIComponent(id)}`, { method: "PATCH", json: { elConversationId } }),
  addTurn: (id: string, turn: { role: Turn["role"]; text: string; clientSeq: number }) =>
    req<{ turn: Turn }>(`/api/sessions/${encodeURIComponent(id)}/turns`, { method: "POST", json: turn }),
  finalize: (id: string, opts: { generateChapter?: LifeTopicKey } = {}) =>
    req<FinalizeResponse>(`/api/sessions/${encodeURIComponent(id)}/finalize`, { method: "POST", json: opts }),
  memory: () => req<MemoryResponse>("/api/memory"),
  chat: (sessionId: string, text: string, clientSeq: number) =>
    req<ChatResponse>("/api/chat", { method: "POST", json: { sessionId, text, clientSeq } }),
  tts: async (text: string): Promise<Blob> => {
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    if (!res.ok) throw new ApiError(res.status, "TTS failed", null);
    return res.blob();
  },
  chapters: () => req<Chapter[]>("/api/chapters"),
  generateChapter: (key: LifeTopicKey) => req<Chapter>("/api/chapters/generate", { method: "POST", json: { key } }),
  editParagraph: (chapterId: string, paragraphId: string, text: string) =>
    req<Chapter>(`/api/chapters/${encodeURIComponent(chapterId)}`, { method: "PATCH", json: { paragraphId, text } }),
  approveChapter: (chapterId: string) =>
    req<Chapter>(`/api/chapters/${encodeURIComponent(chapterId)}`, { method: "PATCH", json: { status: "approved" } }),
  entities: () => req<EntitiesResponse>("/api/entities"),
  tree: () => req<TreeResponse>("/api/tree"),
  matches: () => req<Match[]>("/api/matches"),
  recomputeMatches: () => req<Match[]>("/api/matches", { method: "POST" }),
  matchAction: (id: string, action: "confirm" | "reject") =>
    req<Match>(`/api/matches/${encodeURIComponent(id)}`, { method: "POST", json: { action } }),
  gedcomUrl: (includeUnmatched = false) => `/api/export/gedcom?includeUnmatched=${includeUnmatched ? 1 : 0}`,
  loadDemo: (snapshot: SnapshotName) => req<{ ok: boolean }>("/api/demo/load", { method: "POST", json: { snapshot } }),
};
