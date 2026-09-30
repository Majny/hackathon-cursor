import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(db.chapters);
}
