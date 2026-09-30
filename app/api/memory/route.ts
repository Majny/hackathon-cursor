import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { buildMemory } from "@/lib/memory";
import { buildDynamicVariables, renderGrandchildPrompt } from "@/lib/prompts/grandchild";

export const dynamic = "force-dynamic";

export async function GET() {
  const memory = buildMemory(await getDb());
  return NextResponse.json({ memory, dynamicVariables: buildDynamicVariables(memory), systemPrompt: renderGrandchildPrompt(memory) });
}
