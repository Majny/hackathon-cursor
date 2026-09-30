// Pure helpers for citation numbering and transcript links (no React, no store).
import type { Chapter, Citation } from "@/lib/types";

export interface NumberedCitation extends Citation {
  n: number;          // 1-based number, stable per turnId within a chapter
  sessionId: string;
  href: string;       // /rodina/povidani/<sessionId>#<turnId>
}

/** "s1-t07" -> "s1". Returns null for ids that don't follow `${sessionId}-tNN`. */
export function sessionIdFromTurnId(turnId: string): string | null {
  const m = /^(.+)-t\d+$/.exec(turnId);
  return m ? m[1] : null;
}

export function transcriptHref(turnId: string, sessionId?: string | null): string {
  const sid = sessionId ?? sessionIdFromTurnId(turnId) ?? "";
  return `/rodina/povidani/${encodeURIComponent(sid)}#${encodeURIComponent(turnId)}`;
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

/** "2026-09-30T14:05:00Z" -> "30. 9. 2026" (fixed format, no locale dependency → no hydration mismatch). */
export function formatCzDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

export function formatCzTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Jaroslav" (M) -> "Vzpomínky dědy Jaroslava"; "Marie" (F) -> "Vzpomínky babičky Marie". Naive Czech genitive. */
export function bookTitle(gp: { fullName?: string; sex?: "M" | "F" } | null | undefined): string {
  const first = gp?.fullName?.split(/\s+/)[0];
  if (!first) return "Vzpomínky dědy Jaroslava";
  if (gp?.sex === "F") {
    const gen = first.endsWith("a") ? `${first.slice(0, -1)}y` : first;
    return `Vzpomínky babičky ${gen}`;
  }
  const gen = /[aeiouyáéíóúůý]$/i.test(first) ? first : `${first}a`;
  return `Vzpomínky dědy ${gen}`;
}
