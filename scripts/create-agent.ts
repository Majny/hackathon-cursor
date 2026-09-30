// Creates the ElevenLabs Conversational AI agent (English grandson "Tom") and prints its agent_id.
// Run (orchestrator): npx tsx --env-file=.env.local scripts/create-agent.ts
// Then put the printed id into ELEVENLABS_AGENT_ID. To change an existing agent use scripts/update-agent.ts.
// Valid LLM enum values (Llm.d.ts, SDK 2.70): "claude-haiku-4-5", "claude-sonnet-4-5", "claude-sonnet-4-6",
//   "claude-sonnet-5", "gpt-5-mini", "gpt-5.4-mini", "gemini-2.5-flash", ... (see Llm.d.ts for full list).
import { AGENT_NAME, TTS_MODEL, agentBlock } from "./agent-config";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID");
    process.exit(1);
  }

  const body = {
    name: process.env.ELEVENLABS_AGENT_NAME ?? AGENT_NAME,
    conversation_config: {
      agent: agentBlock({ includeLlm: true }),
      tts: { voice_id: voiceId, model_id: TTS_MODEL },
      turn: { turn_eagerness: "patient", turn_timeout: 10 },
      conversation: { max_duration_seconds: 600 },
    },
    platform_settings: {
      // Private agent: browser connects with a server-minted conversation token.
      auth: { enable_auth: process.env.ELEVENLABS_PUBLIC_AGENT === "1" ? false : true },
    },
  };

  const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Create agent failed: ${res.status}\n${text}`);
    console.error("Tip: remove/tweak fields in scripts/agent-config.ts, or set up manually via `npx tsx scripts/print-agent-prompt.ts`.");
    process.exit(1);
  }
  const { agent_id } = JSON.parse(text) as { agent_id: string };
  console.log(`ELEVENLABS_AGENT_ID=${agent_id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
