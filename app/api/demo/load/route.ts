import { NextResponse } from "next/server";
import { loadSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

const ALLOWED = ["empty", "after-s1", "after-s2", "after-s2-live"];

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { snapshot?: string };
  if (!body.snapshot || !ALLOWED.includes(body.snapshot)) {
    return NextResponse.json({ error: `snapshot must be one of ${ALLOWED.join(", ")}` }, { status: 400 });
  }
  try {
    await loadSnapshot(body.snapshot);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
