// Shared ElevenLabs agent config (English "Heirloom" grandson Tom). Used by create-agent.ts and update-agent.ts.
// Body = REST snake_case of the SDK types (verified in node_modules/@elevenlabs/elevenlabs-js/api/types):
//   AgentConfig{first_message, language, dynamic_variables{dynamic_variable_placeholders}, prompt{prompt, llm, temperature}}
//   TurnConfig{turn_timeout, turn_eagerness: "patient"|"normal"|"eager"}
//   TtsConversationalConfig{voice_id, model_id}, ConversationConfig{max_duration_seconds}
// English agents use the English-only flash model "eleven_flash_v2" (override with ELEVENLABS_TTS_MODEL).
import { GRANDCHILD_TEMPLATE, GRANDCHILD_VARIABLES } from "../lib/prompts/grandchild";
import { FIRST_SESSION_OPENER } from "../lib/memory";

export const AGENT_NAME = "Heirloom – grandson Tom";

export const DEFAULTS: Record<string, string> = {
  grandchild_name: "Tom",
  grandparent_name: "Jaroslav Novák",
  birth_year: "1946",
  session_no: "1",
  memory_summary: "None.",
  known_people: "None.",
  open_threads: "None.",
  next_topic: "Childhood",
  uncovered_topics: "Childhood, School, Military service, Work, Love, Children, Wisdom",
  first_message: FIRST_SESSION_OPENER,
};

export function placeholders(): Record<string, string> {
  return Object.fromEntries(GRANDCHILD_VARIABLES.map((v) => [v, DEFAULTS[v] ?? "None."]));
}

/** conversation_config.agent – identical for create and update. */
export function agentBlock(opts: { includeLlm: boolean }) {
  const prompt: Record<string, unknown> = {
    prompt: GRANDCHILD_TEMPLATE,
    temperature: Number(process.env.ELEVENLABS_TEMPERATURE ?? 0.3),
  };
  if (opts.includeLlm) prompt.llm = process.env.ELEVENLABS_LLM || "claude-haiku-4-5";
  return {
    language: "en",
    first_message: "{{first_message}}",
    dynamic_variables: { dynamic_variable_placeholders: placeholders() },
    prompt,
  };
}

export const TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2";
