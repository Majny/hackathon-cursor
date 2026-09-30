import { mintToken } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";

/** Mints a fresh ElevenLabs conversation token (used on reconnect; /api/sessions also returns one). */
export async function GET() {
  const token = await mintToken();
  if (!token) return Response.json({ error: "ElevenLabs token unavailable", token: null }, { status: 503 });
  return Response.json({ token });
}
