import { NextResponse } from "next/server";
import { updateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "confirm" && body.action !== "reject") {
    return NextResponse.json({ error: "Expected { action: 'confirm'|'reject' }" }, { status: 400 });
  }
  const match = await updateDb((db) => {
    const m = db.matches.find((x) => x.id === id);
    if (!m) return null;
    m.status = body.action === "confirm" ? "confirmed" : "rejected";
    return m;
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  return NextResponse.json(match);
}
