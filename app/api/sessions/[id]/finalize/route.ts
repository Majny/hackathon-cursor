import { NextResponse, after } from "next/server";
import { finalizeSession } from "@/lib/pipeline";
import { generateChapter } from "@/lib/chapters";
import { isLifeTopicKey } from "@/lib/topics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { generateChapter?: string };
  try {
    const result = await finalizeSession(id);
    const key = body.generateChapter;
    if (isLifeTopicKey(key)) {
      after(async () => {
        try { await generateChapter(key); } catch (e) { console.error("[finalize] chapter failed:", (e as Error).message); }
      });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[finalize] failed:", (e as Error).message);
    return NextResponse.json({ error: (e as Error).message, fallbackSnapshot: "after-s2" }, { status: 500 });
  }
}
