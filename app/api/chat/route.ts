import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/store";
import { buildMemory } from "@/lib/memory";
import { renderGrandchildPrompt } from "@/lib/prompts/grandchild";
import { llmText } from "@/lib/llm";
import { turnId, nowIso } from "@/lib/ids";
import type { Turn } from "@/lib/types";

export const dynamic = "force-dynamic";

// STUB by WP0 – WP2 owns. Stores both turns; empty session + "" text -> returns firstMessage.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { sessionId?: string; text?: string; clientSeq?: number } | null;
  if (!body?.sessionId || typeof body.text !== "string") {
    return NextResponse.json({ error: "Expected { sessionId, text, clientSeq }" }, { status: 400 });
  }
  const { sessionId, text } = body;
  const db = await getDb();
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const prior = db.turns.filter((t) => t.sessionId === sessionId).sort((a, b) => a.idx - b.idx);

  let reply: string;
  if (prior.length === 0 && text.trim() === "") {
    reply = session.firstMessage;
  } else {
    const history: Pick<Turn, "role" | "text">[] = [...prior, { role: "grandparent", text }];
    const messages = history.map((t) => ({
      role: t.role === "grandparent" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
    // TODO(WP2): use MemoryContext stored at session start, not recomputed.
    reply = await llmText({ system: renderGrandchildPrompt(buildMemory(db)), messages, maxTokens: 300 });
  }

  const turns = await updateDb((d) => {
    const own = d.turns.filter((t) => t.sessionId === sessionId);
    let seq = own.reduce((m, t) => Math.max(m, t.clientSeq), 0);
    let idx = own.length;
    const added: Turn[] = [];
    const push = (role: Turn["role"], t: string) => {
      idx += 1; seq += 1;
      const turn: Turn = { id: turnId(sessionId, idx), sessionId, idx, clientSeq: seq, role, text: t, at: nowIso() };
      d.turns.push(turn); added.push(turn);
    };
    if (text.trim() !== "") push("grandparent", text);
    push("ai", reply);
    return added;
  });
  return NextResponse.json({ reply, turns });
}
