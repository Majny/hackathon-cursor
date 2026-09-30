import { tts } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (!text) return Response.json({ error: "text is required" }, { status: 400 });
  const audio = await tts(text);
  if (!audio) return Response.json({ error: "TTS unavailable" }, { status: 503 });
  return new Response(audio, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
