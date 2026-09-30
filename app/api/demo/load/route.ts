import { NextResponse } from "next/server";
import { loadSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

const ALLOWED = ["empty", "after-s1", "after-s2", "after-s2-live"];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { snapshot?: string };
  if (!body.snapshot || !ALLOWED.includes(body.snapshot)) {
    return NextResponse.json({ error: `snapshot must be one of ${ALLOWED.join(", ")}` }, { status: 400 });
  }
  const t0 = Date.now();
  try {
    const db = await loadSnapshot(body.snapshot);
    return NextResponse.json({
      ok: true,
      snapshot: body.snapshot,
      ms: Date.now() - t0,
      counts: {
        sessions: db.sessions.length,
        turns: db.turns.length,
        chapters: db.chapters.length,
        persons: db.persons.length,
        matches: db.matches.length,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
