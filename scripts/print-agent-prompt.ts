// Prints the agent system prompt template + settings for manual ElevenLabs dashboard setup.
// Run: npx tsx scripts/print-agent-prompt.ts
import { GRANDCHILD_TEMPLATE, GRANDCHILD_VARIABLES } from "../lib/prompts/grandchild";

console.log("=== System prompt (paste as-is; ElevenLabs fills {{placeholders}}) ===\n");
console.log(GRANDCHILD_TEMPLATE);
console.log("\n=== First message ===\n{{first_message}}");
console.log("\n=== Dynamic variables (add placeholders with any non-empty default) ===");
for (const v of GRANDCHILD_VARIABLES) console.log(`- ${v}`);
console.log(`
=== Settings ===
- Language: Czech (cs)
- Voice: male Czech voice (ELEVENLABS_VOICE_ID), TTS model eleven_flash_v2_5
- LLM: claude-haiku-4-5 (fallback: claude-sonnet-4-5), temperature ~0.3
- Turn eagerness: patient; turn timeout ~10 s
- Max conversation duration: 600 s
- Security: enable authentication (private agent, WebRTC token via /api/el-token)
`);
