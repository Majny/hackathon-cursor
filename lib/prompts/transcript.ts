// Transcript formatting shared by prompts: "[s1-t07] GRANDPA: …" / "[s1-t08] TOM: …"
import type { Turn } from "../types";

export function sortTurns(turns: Turn[]): Turn[] {
  return [...turns].sort((a, b) => (a.sessionId === b.sessionId ? a.idx - b.idx : a.sessionId.localeCompare(b.sessionId, "en", { numeric: true })));
}

export function formatTurn(t: Turn): string {
  return `[${t.id}] ${t.role === "grandparent" ? "GRANDPA" : "TOM"}: ${t.text.trim()}`;
}

export function formatTranscript(turns: Turn[]): string {
  return sortTurns(turns).map(formatTurn).join("\n");
}
