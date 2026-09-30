# Real-time Czech voice loop for a Next.js hackathon app (state as of 30 Sep 2026)

## TL;DR recommendation
- **Primary: ElevenLabs Agents (ElevenAgents) with `@elevenlabs/react`.**
  - Czech is a first-class language (Flash v2.5 TTS plus Scribe v2 Realtime STT with ≤5% WER in Czech).
  - It handles turn-taking, barge-in, VAD and WebRTC for you.
  - Claude can be the LLM in two ways:
    - Built-in dropdown: "Claude Haiku 4.5", "Claude Sonnet 5", "Claude Opus 4.8" and others.
    - Custom LLM: point it at your own Next.js route or at Anthropic's OpenAI-compatible endpoint.
  - Per-session memory goes in through `dynamicVariables` (`{{grandparent_name}}`, `{{memory_summary}}`) or `overrides.agent.prompt`.
  - Transcripts arrive through `onMessage` (source `user`/`ai`), and after the call through the post-call webhook or `GET /v1/convai/conversations/{id}`.
  - **Claude stays the "brain" the brief asks for.**
- **Fallback: a push-to-talk pipeline you own.**
  - Record in the browser (MediaRecorder).
  - Transcribe with ElevenLabs Scribe (`scribe_v2` batch, or `scribe_v2_realtime` through `useScribe`) or with OpenAI `gpt-transcribe`.
  - Send the text to Claude (`@anthropic-ai/sdk`, streaming).
  - Speak the reply with ElevenLabs TTS `eleven_flash_v2_5` and a Czech voice.
  - Expect about 1.5–3 s per turn. It is fully under your control, Claude-native, and still works if the Agents platform misbehaves.
- **Not recommended as primary: OpenAI Realtime (gpt-realtime-2.1).**
  - Latency and barge-in are the best of the three.
  - But the brain is GPT, not Claude, which breaks "Claude as the brain".
  - Czech prosody and accent are weaker than ElevenLabs' Czech voices (my estimate, not documented).
  - Most expensive: $32/M audio tokens in, $64/M out, roughly $0.02/min in plus $0.08/min out.
  - Use it only as a "wow latency" backup, with Claude doing post-call extraction and memory.

---

## (a) OpenAI Realtime API via WebRTC
- **Models:** the alias is `gpt-realtime`; the current snapshot is `gpt-realtime-2.1`. Ephemeral keys come from `POST /v1/realtime/client_secrets` (the response has `value`, which starts with `ek_`). The SDP exchange goes to `POST /v1/realtime/calls`.
- **Minimal shape:**
```ts
// app/api/realtime-token/route.ts (server)
const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ session: {
    type: "realtime", model: "gpt-realtime-2.1",
    instructions: `Mluv česky, pomalu... Paměť: ${memory}`,
    audio: { input: { transcription_model: "whisper-1" /* or gpt-transcribe */ }, output: { voice: "marin" } } } }),
});
// client
const pc = new RTCPeerConnection(); const dc = pc.createDataChannel("oai-events");
pc.ontrack = e => (audioEl.srcObject = e.streams[0]);
pc.addTrack((await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks()[0]);
const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
const sdp = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp,
  headers: { Authorization: `Bearer ${ek}`, "Content-Type": "application/sdp" } });
await pc.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
```
- **Instructions and memory:** set them in the session config when minting the key, or later with a `session.update` event on the data channel. You can also inject a `conversation.item.create` message as context.
- **Transcripts:**
  - User input transcription arrives through `conversation.item.*` / input transcription events. It needs `transcription_model` to be set.
  - The assistant transcript comes in `response.done`, and also in the output audio transcript delta events.
- **Latency:** best of the three, speech-to-speech, typically well under 1 s.
- **Czech:** works, but OpenAI documents no language-specific quality. The voices are English-first, so expect an accent.
- **Pricing gotchas:**
  - Audio costs $32/M in and $64/M out. Assistant audio counts 1 token per 50 ms, user audio 1 per 100 ms.
  - Each response re-bills the growing context.
  - Input transcription is billed extra: `gpt-transcribe` $0.0045/min, gpt-4o-transcribe about $0.006/min.
- **Claude as the brain: poor.** GPT generates the replies; Claude could only do post-processing. Wiring tools to Claude mid-conversation is possible but adds latency.
- **Packages:** none needed (raw WebRTC), or `@openai/agents` (`RealtimeAgent`/`RealtimeSession`).

## (b) ElevenLabs Agents Platform
- **Czech:** supported. Additional languages switch the agent to Multilingual/Flash v2.5. Pick a Czech voice from the Voice Library for native pronunciation. Scribe v2 Realtime (about 150 ms, Czech ≤5% WER) is the STT inside Agents.
- **LLM options:**
  - **Built-in Claude:** Claude Opus 4.8, Opus 4.7, Sonnet 5, Sonnet 4.6, Sonnet 4.5, Haiku 4.5. There are **no 5.5 models in the dropdown yet**. For voice latency, pick **Claude Haiku 4.5** or **Claude Sonnet 5**.
  - **Custom LLM:** an OpenAI-compatible `/v1/chat/completions` (or `/v1/responses`) endpoint with SSE streaming. It receives `messages`, `model`, `tools` and optional `elevenlabs_extra_body`. Two ways to use it:
    1. Use Anthropic's OpenAI-compatibility base URL `https://api.anthropic.com/v1/` with a Claude key as the secret. It supports `stream`. Caveats: `response_format` and `strict` are ignored, and system messages are hoisted. Anthropic calls this layer "not production-ready", which is fine for a hackathon.
    2. Write your own Next.js route that converts OpenAI chat format to `@anthropic-ai/sdk` streaming and re-emits `data: {choices:[{delta:{content}}]}` chunks, ending with `data: [DONE]`. This takes about 40 lines and gives full control: memory lookup, Claude-native params, `claude-haiku-4-5` or `claude-sonnet-5-5`.
    - Either way ElevenLabs must reach the endpoint, so it has to be deployed (Vercel) or tunneled (ngrok/cloudflared).
- **React SDK (`npm i @elevenlabs/react`):**
```tsx
import { ConversationProvider, useConversation } from "@elevenlabs/react";
// wrap app in <ConversationProvider>
const conversation = useConversation({
  onMessage: ({ source, message }) => append({ role: source /* "user"|"ai" */, text: message }),
  onError: console.error,
});
// private agent: server mints a conversation token (WebRTC) or signed URL (WebSocket) with xi-api-key
await conversation.startSession({
  conversationToken, // or agentId for a public agent; signedUrl for websocket
  dynamicVariables: { grandparent_name: "Marie", memory_summary, open_questions },
  // overrides: { agent: { prompt: { prompt: fullPrompt }, firstMessage: "Dobrý den, paní Marie...", language: "cs" } }
});
conversation.sendContextualUpdate("Babička právě ukázala fotku ze svatby 1968"); // context, no reply
conversation.sendUserMessage("..."); conversation.endSession();
```
- **Memory injection:**
  - Put `{{var}}` placeholders in the system prompt and first message in the dashboard, then pass `dynamicVariables` at `startSession`. ElevenLabs recommends this over overrides.
  - `overrides` replace the whole prompt, first message, language or voice. They must be enabled in the agent's Security settings (my note; the docs don't state it clearly).
  - System variables (`system__*`) cannot be overridden.
- **Transcripts:**
  - Live through `onMessage`.
  - After the call through the post-call webhook (`post_call_transcription`, which includes the transcript and analysis), or through `GET /v1/convai/conversations/{conversation_id}` (transcript items with `role`, `time_in_call_secs`, `message`).
  - The fastest option at a hackathon: collect `onMessage` on the client and POST it to your own `/api/extract` when the session ends. No webhook needed.
- **Latency:** about 1 s end-to-end with Flash v2.5 (~75 ms inference) plus Scribe v2 RT. Haiku 4.5 as the LLM keeps it snappy. Opus-class or thinking-on models add seconds.
- **Pricing gotchas:**
  - $0.08/min agent time, plus LLM usage billed separately. Burst over the concurrency limit costs $0.16/min.
  - The free tier gives about 15 agent minutes. **Get a Creator/Pro plan or hackathon credits before the demo.**
  - Custom LLM tokens bill to your Anthropic key.
- **Claude as the brain: good.** Use built-in Claude, or Custom LLM for Claude 5.5 or your own logic.

## (c) Your own pipeline: STT → Claude → TTS
- **STT options (Czech):**
  - **ElevenLabs Scribe:** batch `scribe_v2`, or `scribe_v2_realtime` through `useScribe({ modelId: "scribe_v2_realtime", languageCode: "cs", commitStrategy: CommitStrategy.VAD, onCommittedTranscript })`. The token comes from server-side `POST /v1/single-use-token/realtime_scribe`. Czech ≤5% WER. Best choice.
  - **OpenAI `gpt-transcribe`** ($0.0045/min, language hints) or `gpt-4o-transcribe`/`whisper-1`. Good Czech.
  - **Deepgram Nova-3:** Czech added with streaming and batch, up to 27% WER reduction vs Nova-2. Solid, but it is one more vendor.
- **Brain:** `@anthropic-ai/sdk` `client.messages.stream(...)`. Stream sentences to TTS as they complete.
- **TTS:**
  - ElevenLabs `eleven_flash_v2_5` (32 languages including Czech, ~75 ms inference, HTTP streaming or WebSocket).
  - `eleven_multilingual_v2` for higher quality.
  - `eleven_v3` for expressive speech with audio tags such as [laughs]; slower.
  - OpenAI TTS works but sounds less natively Czech.
  - Packages: `@elevenlabs/elevenlabs-js` on the server (`textToSpeech.stream(voiceId, { modelId: "eleven_flash_v2_5", text, languageCode: "cs" })`), with the audio played in an `<audio>` element or MediaSource.
- **Latency:** 1.5–3 s per turn push-to-talk. About 1–1.5 s with Scribe RT VAD plus sentence-chunked TTS streaming.
- **Complexity:** medium. You write turn-taking, audio playback and interruption yourself, so keep it push-to-talk for the demo.
- **Claude as the brain: best.** Native SDK, any model, structured outputs, full memory control.

## Comparison
| | OpenAI Realtime | ElevenLabs Agents | Own pipeline |
|---|---|---|---|
| Latency | best (<1 s) | ~1 s | 1.5–3 s |
| Czech voice quality | OK, accented | best (native CZ voices) | best (same TTS) |
| Setup in a few hours | medium | **easiest** | medium-hard |
| Claude as brain | no | yes (built-in Claude up to Opus 4.8/Sonnet 5; 5.5 via Custom LLM) | yes, native |
| Memory injection | instructions / session.update | dynamicVariables / overrides / sendContextualUpdate | your own prompt |
| Transcripts | data-channel events | onMessage + webhook + GET conversation | you have them already |
| Key packages | none / `@openai/agents` | `@elevenlabs/react` | `@elevenlabs/react` (useScribe), `@elevenlabs/elevenlabs-js`, `@anthropic-ai/sdk` |

## Suggested hackathon architecture
1. Create the agent in the ElevenLabs dashboard:
   - Language `cs` and a Czech voice.
   - LLM: Claude Haiku 4.5 (fast). Swap to Custom LLM → your `/api/llm` route if time allows.
   - System prompt: a warm Czech interviewer for seniors, one question at a time, with `{{grandparent_name}}`, `{{memory_summary}}` and `{{next_topics}}`.
2. Add a Next.js route `/api/el-token` that mints the conversation token with `xi-api-key`.
3. Client: `useConversation`, then `startSession({ conversationToken, dynamicVariables })`. Keep the transcript from `onMessage` in state.
4. On `endSession`, POST the transcript to `/api/extract`. Claude extracts people, places, dates, events and stories as structured output, merges them into memory (JSON file or SQLite), and generates the biography chapter.
5. Fallback page `/record`: push-to-talk → `/api/stt` (Scribe batch) → `/api/chat` (Claude stream) → `/api/tts` (Flash v2.5).

## Claude model IDs and extraction approach
- **Model IDs (from the Anthropic skill's model table, cached 2026-09-25):**
  - `claude-opus-5-5`: $4/$20 per MTok. Thinking can't be disabled; effort defaults to `medium`. Use it for final biography writing and heavy extraction.
  - `claude-sonnet-5-5`: $2/$10. For fast chat turns set `output_config: { effort: "low" }` (or `thinking: {type: "between_tools"}` to turn thinking off).
  - `claude-haiku-4-5`: $1/$5. The dated snapshot `claude-haiku-4-5-20251001` also works, but prefer the alias. Lowest latency for voice turns.
  - Built-in ElevenLabs Claude options currently top out at Opus 4.8 / Sonnet 5 / Haiku 4.5.
- **Breaking changes on 5.5 models:**
  - Forced `tool_choice` `{type:"any"|"tool"}` returns a 400. Use structured outputs, or `tool_choice: auto` with `strict: true`.
  - Assistant prefill returns a 400.
  - `budget_tokens` returns a 400.
  - The skill also recommends adding `fallbacks: "default"` with beta `server-side-fallback-2026-07-01` for refusal handling.
- **Entity extraction: structured outputs in the TS SDK (recommended):**
```ts
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
const Extraction = z.object({
  people: z.array(z.object({ name: z.string(), relation: z.string(), notes: z.string() })),
  places: z.array(z.object({ name: z.string(), context: z.string() })),
  events: z.array(z.object({ title: z.string(), year: z.string(), description: z.string(), people: z.array(z.string()) })),
  stories: z.array(z.object({ title: z.string(), summary: z.string(), quote: z.string() })),
  follow_up_questions: z.array(z.string()),
});
const client = new Anthropic();
const res = await client.messages.parse({
  model: "claude-opus-5-5", max_tokens: 16000,
  output_config: { format: zodOutputFormat(Extraction), effort: "medium" },
  system: "Extrahuj z přepisu rozhovoru s prarodičem entity. Vše česky.",
  messages: [{ role: "user", content: transcriptText }],
});
const data = res.parsed_output; // null if parse failed -> guard
```
- **Alternative: strict tool use.** Define a tool with `strict: true` and `additionalProperties: false`, set `tool_choice: {type:"auto"}`, and tell Claude in the prompt to call it.
- Output is in `response.content` → `tool_use.input`. Parse it with `JSON.parse`, never with string matching.
- Do not rely on the OpenAI-compat layer for extraction, because it ignores `response_format` and `strict`.

## Sources
- OpenAI WebRTC guide: https://developers.openai.com/api/docs/guides/realtime-webrtc
- OpenAI Realtime overview: https://platform.openai.com/docs/guides/realtime
- 2026 Realtime API changes (client_secrets, /calls, gpt-realtime-2.1): https://www.forasoft.com/blog/article/openai-realtime-api-webrtc-sip-websockets-integration
- gpt-realtime-2.1 pricing: https://vercel.com/ai-gateway/models/gpt-realtime-2.1 , https://www.forasoft.com/blog/article/openai-realtime-api-pricing , https://developers.openai.com/api/docs/pricing
- gpt-transcribe: https://developers.openai.com/api/docs/models/gpt-transcribe
- ElevenLabs LLM options: https://elevenlabs.io/docs/eleven-agents/customization/llm
- ElevenLabs Custom LLM: https://elevenlabs.io/docs/agents-platform/customization/llm/custom-llm
- Dynamic variables: https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables
- Overrides: https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides
- React SDK: https://elevenlabs.io/docs/eleven-agents/libraries/react , https://www.npmjs.com/package/@elevenlabs/react
- Agent language settings: https://elevenlabs.io/docs/eleven-agents/customization/voice/customization/language
- Czech TTS voices: https://elevenlabs.io/text-to-speech/czech
- TTS models: https://elevenlabs.io/docs/overview/models
- Scribe v2 Realtime: https://elevenlabs.io/blog/introducing-scribe-v2-realtime , https://elevenlabs.io/realtime-speech-to-text
- useScribe: https://elevenlabs.io/docs/eleven-api/resources/libraries/scribe-stt/react-scribe
- Post-call webhooks: https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks
- Get conversation API: https://elevenlabs.io/docs/api-reference/conversations/get
- Agents pricing: https://elevenlabs.io/pricing/agents , https://www.cloudzero.com/blog/elevenlabs-pricing/
- Deepgram Nova-3 Czech: https://deepgram.com/learn/deepgram-expands-nova-3-with-11-new-languages-across-europe-and-asia , https://developers.deepgram.com/docs/models-languages-overview
- Anthropic OpenAI SDK compatibility: https://platform.claude.com/docs/en/api/openai-sdk
- Claude model IDs and TS structured outputs: Anthropic claude-api skill (model table cached 2026-09-25; typescript/claude-api/tool-use.md, "Structured Outputs")