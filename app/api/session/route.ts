import { NextResponse } from "next/server";
import { newId, readStore, writeStore, type Session } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  const store = await readStore();

  if (action === "reset") {
    store.sessions = [];
    store.activeSessionId = null;
    store.entities = [];
    store.matches = [];
    store.chapter = null;
    await writeStore(store);
    return NextResponse.json(store);
  }

  if (action === "start") {
    const prior = store.sessions.filter((s) => s.endedAt).at(-1);
    const session: Session = {
      id: newId("ses"),
      index: store.sessions.length + 1,
      messages: [],
      summary: "",
      openThreads: prior?.openThreads ?? [],
      createdAt: new Date().toISOString(),
    };

    if (prior?.summary) {
      session.messages.push({
        role: "assistant",
        content: `Welcome back. Last time we talked about: ${prior.summary.slice(0, 160)}${
          prior.summary.length > 160 ? "…" : ""
        }. ${
          prior.openThreads[0]
            ? prior.openThreads[0].replace(/^Ask more about /i, "Shall we continue with ") + "?"
            : "What would you like to tell me today?"
        }`,
        at: new Date().toISOString(),
      });
    } else {
      session.messages.push({
        role: "assistant",
        content:
          "Hi — I'm here to listen like a curious grandchild. Tell me a story from your childhood. Who was with you?",
        at: new Date().toISOString(),
      });
    }

    store.sessions.push(session);
    store.activeSessionId = session.id;
    await writeStore(store);
    return NextResponse.json(store);
  }

  if (action === "end") {
    const session = store.sessions.find((s) => s.id === store.activeSessionId);
    if (!session) {
      return NextResponse.json({ error: "No active session" }, { status: 400 });
    }
    const { summarizeSession } = await import("@/lib/brain");
    const { summary, openThreads } = summarizeSession(session.messages);
    session.summary = summary;
    session.openThreads = openThreads;
    session.endedAt = new Date().toISOString();
    store.activeSessionId = null;
    await writeStore(store);
    return NextResponse.json(store);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
