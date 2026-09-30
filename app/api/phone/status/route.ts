import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { phoneConfig } from "@/lib/phone";

export const dynamic = "force-dynamic";

/** GET /api/phone/status[?sessionId=] → configured env pieces (booleans only) + call progress for polling. */
export async function GET(req: Request) {
  const config = phoneConfig();
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ config });
  const db = await getDb();
  const s = db.sessions.find((x) => x.id === sessionId);
  if (!s) return NextResponse.json({ config, session: null }, { status: 404 });
  const turns = db.turns.filter((t) => t.sessionId === sessionId).length;
  return NextResponse.json({
    config,
    session: { id: s.id, status: s.status, conversationId: s.elConversationId, endedAt: s.endedAt },
    transcriptArrived: turns > 0,
    turns,
    finalized: s.status === "done",
    failed: s.status === "failed",
  });
}
