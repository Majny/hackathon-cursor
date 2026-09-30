import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createInboundSession } from "@/lib/phone";

export const dynamic = "force-dynamic";

function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * ElevenLabs "conversation initiation client data" webhook — called only for INBOUND Twilio calls.
 * Body from ElevenLabs: { caller_id, agent_id, called_number, call_sid, conversation_id }.
 * Always creates a fresh phone session linked to conversation_id, and returns grandpa's memory as dynamic variables.
 * Auth: when ELEVENLABS_INIT_SECRET is set, header `x-heirloom-secret` must match (configured by scripts/setup-phone.ts).
 */
export async function POST(req: Request) {
  const secret = process.env.ELEVENLABS_INIT_SECRET;
  if (secret && !secretMatches(req.headers.get("x-heirloom-secret"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
  const { session, dynamicVariables } = await createInboundSession(conversationId);
  console.log("[phone/init]", { caller: body.caller_id, call: body.call_sid, conversationId, sessionId: session.id });
  return NextResponse.json({
    type: "conversation_initiation_client_data",
    dynamic_variables: dynamicVariables,
  });
}
