// PATCHes the existing ElevenLabs agent (ELEVENLABS_AGENT_ID) to the English prompt / language / first message.
// Run (orchestrator):
//   npx tsx --env-file=.env.local --env-file=.env.production.local scripts/update-agent.ts
// Flags: --dry  print the body only (no request).
// Env: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID (required);
//      ELEVENLABS_VOICE_ID_EN (optional: switch to an English voice), ELEVENLABS_TTS_MODEL (default eleven_flash_v2),
//      ELEVENLABS_LLM (optional: only sent when set, otherwise the agent keeps its current LLM).
// Body shape = same conversation_config as create-agent.ts (PATCH /v1/convai/agents/{agent_id}, SDK UpdateAgentRequest).
import { AGENT_NAME, TTS_MODEL, agentBlock } from "./agent-config";

async function main() {
  const dry = process.argv.includes("--dry");
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!dry && (!apiKey || !agentId)) {
    console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID");
    process.exit(1);
  }

  const tts: Record<string, string> = { model_id: TTS_MODEL };
  if (process.env.ELEVENLABS_VOICE_ID_EN) tts.voice_id = process.env.ELEVENLABS_VOICE_ID_EN;

  const body = {
    name: process.env.ELEVENLABS_AGENT_NAME ?? AGENT_NAME,
    conversation_config: {
      agent: agentBlock({ includeLlm: !!process.env.ELEVENLABS_LLM }),
      tts,
    },
  };

  if (dry) {
    console.log(JSON.stringify({ ...body, conversation_config: { ...body.conversation_config, agent: { ...body.conversation_config.agent, prompt: { ...body.conversation_config.agent.prompt, prompt: `<${String(body.conversation_config.agent.prompt.prompt).length} chars>` } } } }, null, 2));
    return;
  }

  const url = `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId!)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "xi-api-key": apiKey!, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Update agent failed: ${res.status}\n${text}`);
    console.error("Tip: if the TTS model is rejected, retry with ELEVENLABS_TTS_MODEL=eleven_flash_v2_5 (or eleven_turbo_v2).");
    process.exit(1);
  }

  // Verify what the server now holds.
  const check = await fetch(url, { headers: { "xi-api-key": apiKey! } });
  const cfg = (await check.json()) as {
    conversation_config?: { agent?: { language?: string; first_message?: string; prompt?: { prompt?: string; llm?: string } }; tts?: { model_id?: string; voice_id?: string } };
  };
  const a = cfg.conversation_config?.agent;
  console.log(`Updated agent ${agentId}`);
  console.log(`  language:      ${a?.language}`);
  console.log(`  first_message: ${a?.first_message}`);
  console.log(`  llm:           ${a?.prompt?.llm}`);
  console.log(`  tts:           ${cfg.conversation_config?.tts?.model_id} / voice ${cfg.conversation_config?.tts?.voice_id}`);
  console.log(`  prompt starts: ${(a?.prompt?.prompt ?? "").slice(0, 80)}…`);
  const ok = a?.language === "en" && a?.first_message === "{{first_message}}" && (a?.prompt?.prompt ?? "").startsWith("You are {{grandchild_name}}");
  console.log(ok ? "UPDATE OK" : "UPDATE DONE, but verification mismatched – check the dashboard");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
