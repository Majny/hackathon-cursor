// Server-only ElevenLabs helpers (WP1). Never import from client components.
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const EL_API = "https://api.elevenlabs.io";

/** Mints a short-lived WebRTC conversation token for the private agent. Returns null when env is missing or the call fails. */
export async function mintToken(): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) return null;
  try {
    const res = await fetch(`${EL_API}/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error("[elevenlabs] token mint failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const body = (await res.json()) as { token?: string };
    return body.token ?? null;
  } catch (e) {
    console.error("[elevenlabs] token mint error", e);
    return null;
  }
}

let client: ElevenLabsClient | null = null;

/** Czech TTS via eleven_flash_v2_5 → mp3 bytes, or null when env is missing or the call fails. */
export async function tts(text: string): Promise<ArrayBuffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId || !text.trim()) return null;
  try {
    client ??= new ElevenLabsClient({ apiKey });
    const stream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_flash_v2_5",
      languageCode: "cs",
      outputFormat: "mp3_44100_128",
    });
    const buf = await new Response(stream).arrayBuffer();
    return buf.byteLength > 0 ? buf : null;
  } catch (e) {
    console.error("[elevenlabs] tts error", e);
    return null;
  }
}
