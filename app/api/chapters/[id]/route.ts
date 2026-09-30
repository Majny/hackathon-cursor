import { NextResponse } from "next/server";
import { updateDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { paragraphId?: string; text?: string; status?: "approved" };
  const chapter = await updateDb((db) => {
    const ch = db.chapters.find((c) => c.id === id);
    if (!ch) return null;
    if (body.paragraphId && typeof body.text === "string") {
      const p = ch.paragraphs.find((x) => x.id === body.paragraphId);
      if (p) { p.text = body.text; p.editedByFamily = true; }
    }
    if (body.status === "approved") ch.status = "approved";
    return ch;
  });
  if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  return NextResponse.json(chapter);
}
