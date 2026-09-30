import { NextResponse } from "next/server";
import { storeInfo } from "@/lib/store";
import { llmModels, isMockAi } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { store, stateId } = storeInfo();
  return NextResponse.json({
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY && !!process.env.ELEVENLABS_AGENT_ID,
    supabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    store,
    stateId,
    mockAi: isMockAi(),
    llmProvider: process.env.LLM_PROVIDER || "openai",
    models: llmModels(),
  });
}
