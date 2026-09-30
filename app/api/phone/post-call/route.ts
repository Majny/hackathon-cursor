import { NextResponse, after } from "next/server";
import { ingestPostCall, markCallFailed, verifyElevenLabsSignature, type PostCallPayload } from "@/lib/phone";
import { finalizeSession } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ElevenLabs post-call webhook:
 *  - post_call_transcription → store turns → finalize (summary, entities, matches)
 *  - call_initiation_failure (busy / no answer) → mark session failed
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (secret) {
    if (!verifyElevenLabsSignature(raw, req.headers.get("elevenlabs-signature"), secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[phone/post-call] ELEVENLABS_WEBHOOK_SECRET not set — accepting UNSIGNED webhook. Set it ASAP.");
  }
  let payload: PostCallPayload;
  try { payload = JSON.parse(raw) as PostCallPayload; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (payload.type === "call_initiation_failure") {
    const sessionId = await markCallFailed(
      payload.data?.conversation_id,
      payload.data?.conversation_initiation_client_data?.dynamic_variables?.session_id,
    );
    return NextResponse.json({ ok: true, failed: true, sessionId });
  }
  if (payload.type && payload.type !== "post_call_transcription") {
    return NextResponse.json({ ok: true, ignored: payload.type }); // e.g. post_call_audio
  }
  if (!payload.data?.transcript) return NextResponse.json({ error: "Missing data.transcript" }, { status: 400 });

  const result = await ingestPostCall(payload);
  if (result.ignored) return NextResponse.json({ ok: true, ignored: true });
  const { sessionId, turns, alreadyFinal } = result;
  if (!alreadyFinal) {
    after(async () => {
      try { await finalizeSession(sessionId); } catch (e) { console.error("[phone/post-call] finalize failed:", (e as Error).message); }
    });
  }
  return NextResponse.json({ ok: true, sessionId, turns, finalizeScheduled: !alreadyFinal });
}
