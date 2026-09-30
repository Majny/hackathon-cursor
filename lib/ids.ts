import { customAlphabet } from "nanoid";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 6);

/** Random short id with prefix, e.g. newId("th") -> "th-k3x9a2". */
export function newId(prefix: string): string {
  return `${prefix}-${nano()}`;
}

/** Turn id: `${sessionId}-t${NN}` (idx is 1-based, zero-padded to 2 digits), e.g. "s1-t07". */
export function turnId(sessionId: string, idx: number): string {
  return `${sessionId}-t${String(idx).padStart(2, "0")}`;
}

/** Next session id "s{n}" given existing sessions. */
export function nextSessionId(existing: { id: string; index: number }[]): { id: string; index: number } {
  const index = existing.reduce((m, s) => Math.max(m, s.index), 0) + 1;
  let id = `s${index}`;
  const ids = new Set(existing.map((s) => s.id));
  while (ids.has(id)) id = `s${index}-${nano()}`;
  return { id, index };
}

export function nowIso(): string {
  return new Date().toISOString();
}
