import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/store";
import { buildMemory } from "@/lib/memory";
import { buildDynamicVariables } from "@/lib/prompts/grandchild";
import { mintToken } from "@/lib/elevenlabs";
import { nextSessionId, nowIso } from "@/lib/ids";
import type { Session } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(db.sessions);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { mode?: "voice" | "text" };
  const mode = body.mode === "text" ? "text" : "voice";
  const { session, memory } = await updateDb((db) => {
    const memory = buildMemory(db);
    const { id, index } = nextSessionId(db.sessions);
    const session: Session = {
      id, grandparentId: db.grandparent.id, index, startedAt: nowIso(), endedAt: null, mode,
      status: "live", elConversationId: null, firstMessage: memory.firstMessage,
      continuedThreadId: memory.continuedThreadId,
    };
    db.sessions.push(session);
    return { session, memory };
  });
  const dynamicVariables = buildDynamicVariables(memory);
  const conversationToken = mode === "voice" ? await mintToken().catch(() => null) : null;
  return NextResponse.json({ session, memory, dynamicVariables, conversationToken });
}
