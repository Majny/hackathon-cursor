import { NextResponse } from "next/server";
import { buildChapter, extractEntities } from "@/lib/brain";
import { matchAll } from "@/lib/match";
import { readStore, writeStore } from "@/lib/store";

export async function POST() {
  const store = await readStore();
  const ended = store.sessions.filter((s) => s.endedAt);
  const allMessages = store.sessions.flatMap((s) => s.messages);
  const transcript = allMessages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  store.chapter = buildChapter(allMessages, ended.map((s) => s.id).concat(
    store.sessions.filter((s) => !s.endedAt).map((s) => s.id)
  ));
  store.entities = extractEntities(transcript);
  store.matches = matchAll(store.entities);

  await writeStore(store);
  return NextResponse.json(store);
}
