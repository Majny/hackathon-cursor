import { NextResponse } from "next/server";
import { updateDb } from "@/lib/store";
import { turnId, nowIso } from "@/lib/ids";
import type { Turn } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { role?: string; text?: string; clientSeq?: number } | null;
  if (!body || (body.role !== "grandparent" && body.role !== "ai") || typeof body.text !== "string" || typeof body.clientSeq !== "number") {
    return NextResponse.json({ error: "Expected { role: 'grandparent'|'ai', text, clientSeq }" }, { status: 400 });
  }
  const { role, text, clientSeq } = body as { role: Turn["role"]; text: string; clientSeq: number };
  const turn = await updateDb((db) => {
    if (!db.sessions.some((s) => s.id === id)) return null;
    const own = db.turns.filter((t) => t.sessionId === id);
    const existing = own.find((t) => t.clientSeq === clientSeq);
    if (existing) return existing; // dedupe by (sessionId, clientSeq), not by text
    // id stays stable once assigned (citations); idx is re-derived from clientSeq order
    let n = own.length + 1;
    let tid = turnId(id, n);
    while (own.some((t) => t.id === tid)) tid = turnId(id, ++n);
    const t: Turn = { id: tid, sessionId: id, idx: 0, clientSeq, role, text, at: nowIso() };
    db.turns.push(t);
    [...own, t].sort((a, b) => a.clientSeq - b.clientSeq).forEach((x, i) => { x.idx = i + 1; });
    return t;
  });
  if (!turn) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ turn });
}
