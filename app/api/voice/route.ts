import { NextResponse } from "next/server";
import { voiceConfigured } from "@/lib/llm";

/**
 * Honest voice gate. We do not start a fake realtime session.
 * When OPENAI_API_KEY is present, clients may wire Realtime later;
 * without it, this endpoint reports unavailable.
 */
export async function POST() {
  if (!voiceConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        available: false,
        message:
          "Voice is not configured. Add OPENAI_API_KEY for realtime voice. Text chat works without it.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    available: true,
    message:
      "Voice key detected. Hold-to-talk realtime wiring is the next integration step; use text chat for the reliable demo path today.",
  });
}
