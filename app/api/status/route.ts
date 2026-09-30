import { NextResponse } from "next/server";
import { llmConfigured, voiceConfigured } from "@/lib/llm";
import { readStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  const llm = llmConfigured();
  return NextResponse.json({
    voiceAvailable: voiceConfigured(),
    llmProvider: llm.provider,
    sessionCount: store.sessions.length,
    activeSessionId: store.activeSessionId,
    hasChapter: Boolean(store.chapter),
    entityCount: store.entities.length,
    matchCount: store.matches.length,
  });
}
