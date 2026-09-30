# CONTRACTS (WP0, verified 30. 9. 2026 against installed packages + Context7)

## Installed versions
| package | version |
|---|---|
| next | 16.3.7 |
| react / react-dom | 19.2.8 |
| zod | 4.6.5 |
| openai | 7.25.0 (peer `zod: ^3.25 \|\| ^4.0` → zod 4 OK, no pin needed) |
| @elevenlabs/react | 1.16.0 |
| @elevenlabs/elevenlabs-js | 2.70.0 |
| @google/genai | 2.24.0 |
| @supabase/supabase-js | 2.117.2 |
| vitest | 5.0.3 (+ vite-tsconfig-paths 6, tsx 4, read-gedcom 0.3.2) |
| @types/node | 22 (vitest 5 peer requirement) |

## Frozen files
`lib/types.ts` (= PLAN §5), `lib/schemas.ts`, `lib/store.ts`, `package.json`, `app/layout.tsx`.
Change requests → `docs/CONTRACT_REQUESTS.md`.

---

## @elevenlabs/react 1.16.0 (verified in `node_modules/@elevenlabs/react/dist/conversation/*.d.ts`)

**`useConversation` MUST be used inside `<ConversationProvider>`** (d.ts: "Must be used within a ConversationProvider").
`startSession(options?)` returns `void` (not a Promise) – follow status via `onConnect`/`onStatusChange`.

```tsx
"use client";
import { ConversationProvider, useConversation } from "@elevenlabs/react";

export function Talk() {
  return (
    <ConversationProvider>
      <TalkInner />
    </ConversationProvider>
  );
}

function TalkInner() {
  const conversation = useConversation({
    onConnect: ({ conversationId }) => { /* save elConversationId */ },
    onDisconnect: (details) => { /* details.reason: "user" | "agent" | "error" -> finalize (guard once) */ },
    onError: (message, context) => { /* switch to TextFallback */ },
    onMessage: ({ message, role, source, event_id }) => {
      // role: "user" | "agent"   (source: "user" | "ai" is deprecated)
      // map: role === "user" -> "grandparent", else "ai"
    },
    onModeChange: ({ mode }) => { /* "speaking" | "listening" */ },
  });
  // conversation.status: "disconnected" | "connecting" | "connected" | "disconnecting"
  // conversation.isSpeaking, conversation.endSession(), conversation.sendUserMessage(text)

  const start = async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const r = await fetch("/api/sessions", { method: "POST", body: JSON.stringify({ mode: "voice" }) }).then((x) => x.json());
    conversation.startSession({
      conversationToken: r.conversationToken, // private agent, token minted by server
      connectionType: "webrtc",
      dynamicVariables: r.dynamicVariables,   // Record<string, string | number | boolean>; send ALL keys
    });
  };
}
```
Types: `PrivateWebRTCSessionConfig = { conversationToken: string; connectionType?: "webrtc"; agentId?: never }`.
`DisconnectionDetails = {reason:"error",message,context} | {reason:"agent",...} | {reason:"user"}`.

Server token mint (WP1, `lib/elevenlabs.ts`):
`GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=<ID>` with header `xi-api-key` → `{ token }`.

TTS (`@elevenlabs/elevenlabs-js`): `client.textToSpeech.convert(voiceId, { text, modelId: "eleven_flash_v2_5", languageCode: "cs" })`
(`modelId`, `languageCode` fields verified in `BodyTextToSpeechFull.d.ts`).

## openai 7.25.0 – structured outputs (zod 4 compatible)
```ts
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const client = new OpenAI(); // OPENAI_API_KEY
const res = await client.chat.completions.parse({
  model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
  messages: [{ role: "system", content: system }, { role: "user", content: user }],
  response_format: zodResponseFormat(SessionSummarySchema, "summary"),
  reasoning_effort: "low", // try/catch: retry without it if model rejects; never send temperature to reasoning models
});
const msg = res.choices[0].message;
if (msg.refusal || !msg.parsed) { /* 1 retry -> Gemini */ }
const data = msg.parsed; // typed
```
Emergency path (if helper misbehaves): `response_format: { type: "json_schema", json_schema: { name, strict: true, schema: z.toJSONSchema(Schema) } }`
+ `Schema.parse(JSON.parse(content))`.

## @google/genai 2.24.0 – structured JSON
Field is **`responseJsonSchema`** (accepts plain JSON Schema; `responseSchema` is the older OpenAPI-subset alternative – do not set both).
```ts
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const res = await ai.models.generateContent({
  model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  contents: user,
  config: {
    systemInstruction: system,
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(schema),
  },
});
const data = schema.parse(JSON.parse(res.text ?? ""));
```

---

## Store (`lib/store.ts`) – server only
- `getDb(): Promise<Db>`
- `updateDb<T>(fn: (db) => T | Promise<T>): Promise<T>` – mutate `db` in place, return value. In-process mutex; Supabase optimistic `version` check with up to 3 retries (fn may re-run → no side effects inside). File mode: tmp + rename.
- `loadSnapshot(name)` – replaces state from `data/snapshots/<name>.json`.
- `readSnapshot(name)`, `replaceDb(db)`, `storeInfo()` – helpers.
- Missing state (file or Supabase row) → auto-seeded from `after-s1` if present, else `empty`.
- Env: `STORE=file|supabase` (default supabase), `STATE_ID` (default `local`), `DB_FILE` (optional override, used by tests), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## LLM (`lib/llm.ts`)
`llmStructured({ task, schema, system, user, writer? }) → { data, provider, model, ms }`, `llmText({ system, messages, maxTokens? }) → string`.
`MOCK_AI=1` → `data/fixtures/<task>.json` (validated by schema); `llmText` mock → `data/fixtures/chat.json` `.replies[n % len]`.
OpenAI/Gemini branches are TODO (WP2).

## Schemas (`lib/schemas.ts`)
- `SessionSummarySchema` = `SessionSummary` without `sessionId`.
- `ExtractionSchema` = `{ persons: [{mentionName, givenName|null, surname|null, sex|null, birthYear|null, birthYearApprox, place|null, relationToGrandparent, notes, existingId|null, turnIds}], places: [{name, context, turnIds}], events: [{title, year|null, yearApprox, description, personNames, placeNames, turnIds}] }`.
- `ChapterSchema` = `{ title, paragraphs: [{ text, citations: string[] }], openQuestions }`.
- `DbSchema` – whole `Db` (for snapshot validation tests).

## Stubs to replace
| stub | owner | current behaviour |
|---|---|---|
| `lib/elevenlabs.ts` `mintToken()` / `tts()` | WP1 | return `null` |
| `lib/matching/match.ts` `suggestMatches()` | WP3 | returns only confirmed/rejected from `previous` (no new suggestions) |
| `lib/memory.ts` `buildMemory()` | WP2 | minimal deterministic version |
| `lib/prompts/grandchild.ts` | WP2 | draft template §7.1 + `renderGrandchildPrompt`, `buildDynamicVariables` |
| `lib/pipeline.ts` `finalizeSession()` | WP2 | mock: summary fixture → store, no extraction merge |
| `app/api/**` | per PLAN §4 | typed stubs over store/fixtures |

## API (PLAN §6) – typed client in `lib/api-client.ts`
All routes return JSON; errors `{ error: string }` with 4xx/5xx. Finalize error: `500 { error, fallbackSnapshot: "after-s2" }`.
