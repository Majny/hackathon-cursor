import { NextResponse } from "next/server";
import { finalizeSession } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(await finalizeSession(id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, fallbackSnapshot: "after-s2" }, { status: 500 });
  }
}
