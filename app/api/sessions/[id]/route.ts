import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const session = db.sessions.find((s) => s.id === id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const turns = db.turns.filter((t) => t.sessionId === id).sort((a, b) => a.idx - b.idx);
  const summary = db.summaries.find((s) => s.sessionId === id) ?? null;
  return NextResponse.json({ session, turns, summary });
}

/** PATCH { elConversationId } – store ElevenLabs conversation id from onConnect. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { elConversationId?: string };
  const session = await updateDb((db) => {
    const s = db.sessions.find((x) => x.id === id);
    if (s && typeof body.elConversationId === "string") s.elConversationId = body.elConversationId;
    return s ?? null;
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session });
}
