import { NextResponse } from "next/server";
import { createPhoneSession, normalizeNumber, phoneConfig, setConversationId, startOutboundCall } from "@/lib/phone";
import { updateDb } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST → places an outbound call from "Tom" to grandpa. Returns { sessionId, conversationId }.
 * Always dials GRANDPA_PHONE_NUMBER; any `to` in the body is ignored (no calling arbitrary numbers).
 */
export async function POST() {
  const cfg = phoneConfig();
  if (!cfg.canCall) return NextResponse.json({ error: "Phone calling is not configured", config: cfg }, { status: 503 });
  const to = normalizeNumber(process.env.GRANDPA_PHONE_NUMBER || "");
  if (!/^\+\d{6,15}$/.test(to)) return NextResponse.json({ error: "GRANDPA_PHONE_NUMBER missing or invalid (E.164, e.g. +420777123456)" }, { status: 400 });

  const { session, dynamicVariables } = await createPhoneSession();
  try {
    const { conversationId, callSid } = await startOutboundCall(to, dynamicVariables);
    if (conversationId) await setConversationId(session.id, conversationId);
    return NextResponse.json({ sessionId: session.id, conversationId, callSid });
  } catch (e) {
    console.error("[phone/call]", (e as Error).message);
    await updateDb((db) => {
      const s = db.sessions.find((x) => x.id === session.id);
      if (s) { s.status = "failed"; s.endedAt = new Date().toISOString(); }
    }).catch(() => undefined);
    return NextResponse.json({ error: (e as Error).message, sessionId: session.id }, { status: 502 });
  }
}
