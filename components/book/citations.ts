// Pure helpers for citation numbering and transcript links (no React, no store).
import type { Chapter, Citation } from "@/lib/types";

export interface NumberedCitation extends Citation {
  n: number;          // 1-based number, stable per turnId within a chapter
  sessionId: string;
  href: string;       // /family/sessions/<sessionId>#<turnId>
}

/** "s1-t07" -> "s1". Returns null for ids that don't follow `${sessionId}-tNN`. */
export function sessionIdFromTurnId(turnId: string): string | null {
  const m = /^(.+)-t\d+$/.exec(turnId);
  return m ? m[1] : null;
}

export function transcriptHref(turnId: string, sessionId?: string | null): string {
  const sid = sessionId ?? sessionIdFromTurnId(turnId) ?? "";
  return `/family/sessions/${encodeURIComponent(sid)}#${encodeURIComponent(turnId)}`;
}

/**
 * Numbers citations across a whole chapter in order of first appearance.
 * The same turnId always gets the same number; duplicates within a paragraph are dropped.
 * Returns one array per paragraph (same order as chapter.paragraphs).
 */
export function numberCitations(
  paragraphs: { citations: Citation[] }[],
  turnSessionMap?: Record<string, string>,
): NumberedCitation[][] {
  const numbers = new Map<string, number>();
  return paragraphs.map((p) => {
    const seen = new Set<string>();
    const out: NumberedCitation[] = [];
    for (const c of p.citations ?? []) {
      if (!c?.turnId || seen.has(c.turnId)) continue;
      seen.add(c.turnId);
      let n = numbers.get(c.turnId);
      if (n === undefined) {
        n = numbers.size + 1;
        numbers.set(c.turnId, n);
      }
      const sessionId = turnSessionMap?.[c.turnId] ?? sessionIdFromTurnId(c.turnId) ?? "";
      out.push({ ...c, n, sessionId, href: transcriptHref(c.turnId, sessionId) });
    }
    return out;
  });
}

/** Chapter-level stats for badges. */
export function chapterStats(ch: Pick<Chapter, "paragraphs">) {
  const total = ch.paragraphs.length;
  const unverified = ch.paragraphs.filter((p) => !p.verified).length;
  const edited = ch.paragraphs.filter((p) => p.editedByFamily).length;
  return { total, unverified, edited };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-30T14:05:00Z" -> "30 Sep 2026" (en-GB style, fixed format, no locale dependency -> no hydration mismatch). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "14:05" (24h, en-GB). */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** @deprecated kept for backwards compatibility; use formatDate / formatTime. */
export const formatCzDate = formatDate;
export const formatCzTime = formatTime;

/** "Jaroslav" (M) -> "Grandpa Jaroslav's Memories"; "Marta" (F) -> "Grandma Marta's Memories". */
export function bookTitle(gp: { fullName?: string; sex?: "M" | "F" } | null | undefined): string {
  const first = gp?.fullName?.split(/\s+/)[0] || "Jaroslav";
  return `${gp?.sex === "F" ? "Grandma" : "Grandpa"} ${first}'s Memories`;
}

const NICKNAMES: Record<string, string> = { Jaroslav: "Jarda", Josef: "Pepa", "Tomáš": "Tom", Tomas: "Tom" };

/** Friendly short name: "Jaroslav Novák" -> "Jarda", "Tomáš" -> "Tom". */
export function nickname(name: string | null | undefined, fallback = ""): string {
  const first = name?.trim().split(/\s+/)[0];
  if (!first) return fallback;
  return NICKNAMES[first] ?? first;
}
