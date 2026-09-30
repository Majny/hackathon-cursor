import { NextResponse } from "next/server";
import { generateChapter } from "@/lib/chapters";
import { isLifeTopicKey } from "@/lib/topics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = body.key;
  if (!isLifeTopicKey(key)) return NextResponse.json({ error: "Neplatné téma kapitoly." }, { status: 400 });
  try {
    return NextResponse.json(await generateChapter(key));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
