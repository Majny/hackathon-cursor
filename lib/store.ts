import { promises as fs } from "fs";
import path from "path";

export type Role = "user" | "assistant" | "system";

export type Message = {
  role: Role;
  content: string;
  at: string;
};

export type Session = {
  id: string;
  index: number;
  messages: Message[];
  summary: string;
  openThreads: string[];
  createdAt: string;
  endedAt?: string;
};

export type Entity = {
  id: string;
  kind: "person" | "place" | "event";
  name: string;
  place?: string;
  year?: number;
  notes?: string;
};

export type MatchProposal = {
  entityId: string;
  treePersonId: string;
  score: number;
  reasons: string[];
  status: "proposed" | "confirmed" | "rejected";
};

export type Chapter = {
  title: string;
  body: string;
  sourceSessionIds: string[];
  createdAt: string;
};

export type Store = {
  sessions: Session[];
  activeSessionId: string | null;
  entities: Entity[];
  matches: MatchProposal[];
  chapter: Chapter | null;
};

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

const emptyStore = (): Store => ({
  sessions: [],
  activeSessionId: null,
  entities: [],
  matches: [],
  chapter: null,
});

export async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return emptyStore();
  }
}

export async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
