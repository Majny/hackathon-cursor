import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/store";
import { buildMemory } from "@/lib/memory";
import { renderGrandchildPrompt } from "@/lib/prompts/grandchild";
import { llmText } from "@/lib/llm";
import { turnId, nowIso } from "@/lib/ids";
import type { Db, MemoryContext, Session, Turn } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Memory as it was at session start: exclude this session (and later ones) from summaries/threads. */
function memoryForSession(db: Db, session: Session): MemoryContext {
  const earlier = new Set(db.sessions.filter((s) => s.index < session.index).map((s) => s.id));
  const view: Db = {
    ...db,
    sessions: db.sessions.filter((s) => earlier.has(s.id)),
    summaries: db.summaries.filter((s) => earlier.has(s.sessionId)),
    threads: db.threads.filter((t) => earlier.has(t.createdInSession)),
  };
  return {
    ...buildMemory(view),
    sessionNo: session.index,
    firstMessage: session.firstMessage,
    continuedThreadId: session.continuedThreadId,
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { sessionId?: string; text?: string; clientSeq?: number } | null;
  if (!body?.sessionId || typeof body.text !== "string") {
    return NextResponse.json({ error: "Expected { sessionId, text, clientSeq }" }, { status: 400 });
  }
  const { sessionId, text } = body;
  const clientSeq = typeof body.clientSeq === "number" ? body.clientSeq : null;
  const db = await getDb();
  const session = db.sessions.find((s) => s.id === sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  const prior = db.turns.filter((t) => t.sessionId === sessionId).sort((a, b) => a.idx - b.idx);

  // Dedupe retries: same clientSeq already stored -> return stored pair.
  if (clientSeq !== null && text.trim() !== "") {
    const dup = prior.find((t) => t.clientSeq === clientSeq && t.role === "grandparent");
    const next = dup && prior.find((t) => t.idx > dup.idx && t.role === "ai");
    if (dup && next) return NextResponse.json({ reply: next.text, turns: [dup, next] });
  }

  let reply: string;
  if (prior.length === 0 && text.trim() === "") {
    reply = session.firstMessage;
  } else {
    const history: Pick<Turn, "role" | "text">[] = [...prior];
    if (text.trim() !== "") history.push({ role: "grandparent", text });
    const messages = history.map((t) => ({
      role: t.role === "grandparent" ? ("user" as const) : ("assistant" as const),
      content: t.text,
    }));
    try {
      reply = await llmText({ system: renderGrandchildPrompt(memoryForSession(db, session)), messages, maxTokens: 300 });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const turns = await updateDb((d) => {
    const own = d.turns.filter((t) => t.sessionId === sessionId);
    let seq = own.reduce((m, t) => Math.max(m, t.clientSeq), clientSeq ?? 0);
    let idx = own.reduce((m, t) => Math.max(m, t.idx), 0);
    const ids = new Set(own.map((t) => t.id));
    const added: Turn[] = [];
    const push = (role: Turn["role"], t: string, cs?: number) => {
      idx += 1;
      const s = cs ?? ++seq;
      let n = idx;
      while (ids.has(turnId(sessionId, n))) n++;
      idx = n;
      const turn: Turn = { id: turnId(sessionId, n), sessionId, idx: n, clientSeq: s, role, text: t, at: nowIso() };
      ids.add(turn.id);
      d.turns.push(turn); added.push(turn);
    };
    if (text.trim() !== "") {
      const useSeq = clientSeq !== null && !own.some((t) => t.clientSeq === clientSeq) ? clientSeq : undefined;
      push("grandparent", text, useSeq);
    }
    push("ai", reply);
    return added;
  });
  return NextResponse.json({ reply, turns });
}
