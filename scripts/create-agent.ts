// Creates the ElevenLabs Conversational AI agent ("zvídavé vnouče") and prints its agent_id.
// Run (orchestrator): npx tsx --env-file=.env.local scripts/create-agent.ts
// Then put the printed id into ELEVENLABS_AGENT_ID.
//
// Body = REST snake_case of the SDK types (verified in node_modules/@elevenlabs/elevenlabs-js/api/types):
//   AgentConfig{first_message, language, dynamic_variables{dynamic_variable_placeholders}, prompt{prompt, llm, temperature}}
//   TurnConfig{turn_timeout, turn_eagerness: "patient"|"normal"|"eager"}
//   TtsConversationalConfig{voice_id, model_id}, ConversationConfig{max_duration_seconds}
// Valid LLM enum values (Llm.d.ts, SDK 2.70): "claude-haiku-4-5", "claude-sonnet-4-5", "claude-sonnet-4-6",
//   "claude-sonnet-5", "gpt-5-mini", "gpt-5.4-mini", "gemini-2.5-flash", ... (see Llm.d.ts for full list).
import { GRANDCHILD_TEMPLATE, GRANDCHILD_VARIABLES } from "../lib/prompts/grandchild";

const DEFAULTS: Record<string, string> = {
  grandchild_name: "Tomáš",
  grandparent_name: "Jaroslav",
  birth_year: "1948",
  session_no: "1",
  memory_summary: "Žádné.",
  known_people: "Žádné.",
  open_threads: "Žádné.",
  next_topic: "dětství",
  uncovered_topics: "dětství, škola, práce, láska a rodina",
  first_message:
    "Ahoj dědo, to jsem já, Tomáš. Moc rád bych si s tebou povídal o tom, jak jsi byl malý. Kde jsi vyrůstal?",
};

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) {
    console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID");
    process.exit(1);
  }
  const placeholders = Object.fromEntries(GRANDCHILD_VARIABLES.map((v) => [v, DEFAULTS[v] ?? "Žádné."]));

  const body = {
    name: process.env.ELEVENLABS_AGENT_NAME ?? "Zvídavé vnouče (Tomáš)",
    conversation_config: {
      agent: {
        language: "cs",
        first_message: "{{first_message}}",
        dynamic_variables: { dynamic_variable_placeholders: placeholders },
        prompt: {
          prompt: GRANDCHILD_TEMPLATE,
          llm: process.env.ELEVENLABS_LLM || "claude-haiku-4-5",
          temperature: Number(process.env.ELEVENLABS_TEMPERATURE ?? 0.3),
        },
      },
      tts: { voice_id: voiceId, model_id: "eleven_flash_v2_5" },
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
    console.error("Tip: remove/tweak fields in scripts/create-agent.ts, or set up manually via `npx tsx scripts/print-agent-prompt.ts`.");
    process.exit(1);
  }
  const { agent_id } = JSON.parse(text) as { agent_id: string };
  console.log(`ELEVENLABS_AGENT_ID=${agent_id}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
