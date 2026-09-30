import { NextResponse } from "next/server";
import { getFakeTree } from "@/lib/match";

export async function GET() {
  return NextResponse.json(getFakeTree());
}
