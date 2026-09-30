import { NextResponse } from "next/server";
import { generateFollowUp } from "@/lib/llm";
import { readStore, writeStore } from "@/lib/store";

export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const store = await readStore();
  const session = store.sessions.find((s) => s.id === store.activeSessionId);
  if (!session || session.endedAt) {
    return NextResponse.json({ error: "Start a session first" }, { status: 400 });
  }

  const userText = text.trim();
  session.messages.push({
    role: "user",
    content: userText,
    at: new Date().toISOString(),
  });

  const prior = store.sessions.filter((s) => s.endedAt && s.id !== session.id).at(-1);

  const { reply, via } = await generateFollowUp({
    messages: session.messages,
    openThreads: session.openThreads,
    priorSummary: prior?.summary ?? null,
    userText,
  });

  session.messages.push({
    role: "assistant",
    content: reply,
    at: new Date().toISOString(),
  });

  await writeStore(store);
  return NextResponse.json({ store, via });
}
