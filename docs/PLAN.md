# AI životopisec pro prarodiče: finální implementační plán

> Cursor Hackathon Prague „Forge the Stack“, 30. 9. 2026, Productboard (Palmovka).
> **Teď je 15:00. Code freeze je v 18:00.** Pracuje jeden vývojář a Claude Code subagenti.
> **Cíl: end-to-end funkční do 16:45.** Potom polish, deploy, seed a příprava pitche.
> Hodnocení: **Execution ×2** + Usefulness + Clarity (max 20). Pitch trvá 1 min ve skupině a 2 min ve finále.
> Plán vychází z plánu „demo-first“ (nejvyšší skóre v kritikách). Jsou do něj převzaté nejlepší nápady z „risk-first“ a „parallel-agents“ a opravené všechny chyby z kritik.
> **Změna proti původním plánům: nemáme Anthropic klíč.** Claude zůstává mozkem hovoru jako vestavěné LLM v ElevenLabs agentovi (účtuje ElevenLabs). Shrnutí, extrakci, kapitoly a textový chat dělá **OpenAI**, záložní poskytovatel je **Gemini**. Data jsou v **Supabase**, deploy na **Render**.

---

## 0. O hackathonu

### Potvrzeno (Luma + slide repo organizátorů)
- **Název:** „Cursor Hackathon Prague: Forge the Stack“. Tagline: „One afternoon to build the tools developers actually need“. Je to první pražský ročník.
- **Místo:** Productboard Czechia, Boudníkova 3, Praha 8.
- **Program:** 12:30 dveře, 13:00 kickoff, 13:30–18:00 build (countdown do **18:00 = code freeze**), 18:00–19:00 pitche a ceny (top 3), od 19:30 afterparty (incident.io).
- **Porota:** Daniel Hejl (Productboard, CAIO), Ben King (incident.io), Petr Podrouzek (IP Fabric, CTO), Kate Douskova (pitch coach). **Porota je částečně anglicky mluvící, pitch proto vedeme anglicky.**
- **Formát:**
  - Skupinové kolo: 4 skupiny po 1 porotci, **1 min na projekt**.
  - Každý porotce vybere top 3, do finále jde 12 projektů.
  - Finále: **2 min včetně otázek**.
  - Heslo: „Show the product working. Make the problem and value clear.“
- **Rubrika:** Execution ×2 („Does it work? What was actually built?“), Usefulness ×1, Clarity ×1. Každé kritérium 1–5 bodů, max 20.
- **Check-in:** https://spacexai-checkin.vercel.app/project. Povinný je jen název projektu, volitelně GitHub link a web. Devpost ani video se nevyžadují.

### Odvozeno, nepotvrzeno
- Velikost týmu není stanovená, solo je nejspíš OK.
- Cursor se očekává, ale v rubrice není.
- Kredity pro tuto akci nejsou zveřejněné. Na jiných akcích dostali finalisté cca $20 Cursor kreditů.
- Téma „dev tools“ je spíš vodítko než pravidlo. V pitchi stačí jedna věta o znovupoužitelné pipeline „voice → paměť → strukturovaná data → GEDCOM“.
- Sponzorské nástroje: Render, Exa.ai, Wispr Flow, Productboard, Cursor. Použití Renderu je bonus.

### Zdroje
- https://luma.com/cursor-mljb
- https://github.com/ivoklimsa/spacexai_events (PR #1, `slides/prague/index.tsx`)
- https://spacexai-events.vercel.app/s/prague
- https://spacexai-checkin.vercel.app/project

---

## 1. Principy

1. **Demo nesmí stát na jednom živém pokusu.**
   - Session 1 je předem naseedovaná (ručně napsaný snapshot `after-s1`).
   - Živě běží jen krátká session 2.
   - Kapitola a návrh shody s Pepou existují předgenerované ve snapshotu `after-s2`, který jde načíst jedním klikem z `/demo`.
2. **Paměť je deterministická.**
   - Na startu session se nevolá LLM.
   - První věta agenta je `{{first_message}}` z dynamicVariables, složená kódem ze shrnutí minulé session.
3. **Citace vynucuje kód.** Odstavec bez platné citace repliky dědy dostane štítek „neověřeno“.
4. **Priority:** P0 = must-have z briefu + Pepa match + snapshoty + deploy. P1 = GEDCOM, editace, anglické titulky, TTS v textovém režimu. P2 = zbytek.
   - **Pokud v 16:30 neběží P0 end-to-end, škrtá se všechno P1/P2 bez diskuse.**
5. **Subagenti nesahají na sdílené soubory**, nespouštějí `next build` ani `next dev` a **necommitují**. Commituje jen orchestrátor.

---

## 2. Finální tech stack

| Vrstva | Volba |
|---|---|
| Framework | Next.js (aktuální major, App Router, TS, **Tailwind v4 CSS-first, žádný `tailwind.config.js`**) |
| Hlas | **ElevenLabs Agents**, `@elevenlabs/react` (WebRTC). Privátní agent, token mintovaný serverem. Jazyk `cs`, **mužský český hlas** (persona vnuk Tomáš), TTS `eleven_flash_v2_5`, STT Scribe v2 RT (interní). |
| LLM v hovoru | Vestavěný **Claude** v ElevenLabs: **Claude Haiku 4.5** jako výchozí kvůli latenci, pokud je příliš „hloupý“ tak Claude Sonnet 5. Přesný název přečíst v dropdownu dashboardu. |
| Paměť do agenta | **`dynamicVariables`** (primární). First message = `{{first_message}}`. Overrides se nepoužívají. |
| Textový fallback | `/api/chat` → `llmText()` (OpenAI, stejný grandchild prompt s dosazenými proměnnými) + `/api/tts` (ElevenLabs `eleven_flash_v2_5`, `languageCode: "cs"`). |
| Shrnutí, extrakce, kapitoly | **OpenAI** přes balíček `openai`: `client.chat.completions.parse` + `zodResponseFormat` z `openai/helpers/zod`. Modely z env: `OPENAI_MODEL` (rychlý, shrnutí a extrakce) a `OPENAI_MODEL_WRITER` (kapitoly). |
| Záložní LLM | **Gemini** přes `@google/genai`: `responseMimeType: "application/json"` + JSON schema ze zod, pak `schema.parse()`. Model z `GEMINI_MODEL`. |
| Abstrakce | `lib/llm.ts`: `llmStructured()` a `llmText()`. Pořadí: `MOCK_AI=1` → fixture, jinak `LLM_PROVIDER` (default `openai`), při chybě druhý provider, pak výjimka (volající nabídne snapshot). |
| Úložiště | **Supabase Postgres**, jedna JSONB řádka na prostředí (`app_state`), přes `@supabase/supabase-js` a service role klíč jen na serveru. Lokálně volitelně `STORE=file` (`data/db.json`). Snapshoty jsou JSON soubory v repu. |
| Deploy | **Render** Web Service (Node), auto-deploy z `main` na GitHubu `Majny/hackathon-cursor`. Render dává HTTPS, takže mikrofon funguje i na veřejné URL. |
| Strom UI | Vlastní CSS/SVG layout po generacích. **family-chart nepoužíváme.** |
| Matching | Vlastní Jaro-Winkler, slovník zdrobnělin, normalizace diakritiky a přechýlení, **tvrdé brány** (viz §9). |
| GEDCOM | Vlastní writer 5.5.1. `read-gedcom` jen pro round-trip test. |
| Testy | `vitest` + `vite-tsconfig-paths` (alias `@/*`), `tsx` pro skripty. |

### Balíčky (instaluje jen WP0)
```
npm i @elevenlabs/react @elevenlabs/elevenlabs-js openai @google/genai @supabase/supabase-js zod nanoid
npm i -D vitest vite-tsconfig-paths tsx read-gedcom
```
- **Verze zod:** WP0 přes Context7 ověří, kterou major verzi vyžaduje `openai/helpers/zod`.
  - Pokud helper s nainstalovaným zodem nefunguje, pinovat `zod@3.25.x`.
  - Nouzová cesta: `response_format: { type: "json_schema", json_schema: { name, strict: true, schema: z.toJSONSchema(Schema) } }` a ruční `Schema.parse(JSON.parse(content))`.
- **`@elevenlabs/react`:** WP0 i WP1 před psaním kódu ověří v Context7 aktuální API:
  - zda je potřeba `ConversationProvider`, nebo stačí `useConversation`;
  - tvar `onMessage` (`{source: "user" | "ai" | "agent", message}`);
  - `connectionType: "webrtc"`;
  - `conversationToken`;
  - `onConnect({conversationId})` a `onDisconnect`.

  Výsledek WP0 zapíše jako snippet do `docs/CONTRACTS.md`.

### Modely (neověřené ID nejsou natvrdo v kódu, jen jako env s defaultem)
```
OPENAI_MODEL=gpt-5-mini          # OVĚŘIT: GET https://api.openai.com/v1/models; musí umět structured outputs
OPENAI_MODEL_WRITER=gpt-5        # OVĚŘIT; když je pomalý (>25 s), použít OPENAI_MODEL
GEMINI_MODEL=gemini-2.5-flash    # OVĚŘIT: GET https://generativelanguage.googleapis.com/v1beta/models?key=...
```
- U reasoning modelů **neposílat `temperature`** (vrací 400). Posílat `reasoning_effort: "low"` pro rychlost, s try/catch: když parametr model nepodporuje, zopakovat bez něj.
- **Strict structured outputs:** všechna pole musí být `required`. Volitelná pole se píší jako `.nullable()`, ne `.optional()`. Žádné `.min()`/`.max()`/regex v schématech.

### Env (`.env.example`)
```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_MODEL_WRITER=gpt-5
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
LLM_PROVIDER=openai              # openai | gemini
MOCK_AI=0                        # 1 = fixtures místo LLM volání
ELEVENLABS_API_KEY=              # jen server! klíč musí mít oprávnění ConvAI + TTS
ELEVENLABS_AGENT_ID=
ELEVENLABS_VOICE_ID=             # stejný mužský český hlas jako agent
STORE=supabase                   # supabase | file
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=       # jen server!
STATE_ID=local                   # "local" lokálně, "prod" na Renderu – lokální vývoj nepřepisuje demo data
```

### Supabase (člověk spustí v SQL editoru, cca 2 min)
```sql
create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  version int not null default 0,
  updated_at timestamptz not null default now()
);
alter table app_state enable row level security;  -- bez policies: anon nic nevidí, service role ano
```

---

## 3. Architektura

```
┌───────────── Prohlížeč ─────────────┐
│ /  (Povídat, senior UI)              │── useConversation (WebRTC) ──► ElevenLabs Agent
│   onMessage → POST /turns (clientSeq)│      (Scribe v2 RT cs → Claude Haiku 4.5 → Flash v2.5 cs)
│   onDisconnect/Skončit → /finalize   │
│   [fallback] text → /api/chat → /tts │
│ /rodina/* (kniha, lidé, strom)       │
│ /demo (snapshoty, stav klíčů, paměť) │
└──────────────┬───────────────────────┘
               │ lib/api-client.ts
┌──────────────▼────── Next.js API (Render) ───────────────────┐
│ POST /api/sessions   → buildMemory() (bez LLM) + EL token     │
│                        → { session, dynamicVariables, token } │
│ POST /api/sessions/:id/turns                                  │
│ POST /api/sessions/:id/finalize (idempotentní)                │
│    Promise.all(summarize, extract)  [llmStructured]           │
│    → mergeEntities → suggestMatches → (volitelně) chapter     │
│ /api/chat, /api/tts, /api/chapters*, /api/entities, /api/tree │
│ /api/matches*, /api/export/gedcom, /api/demo/load, /api/health│
└──────────────┬───────────────────────────┬────────────────────┘
        lib/llm.ts (OpenAI → Gemini)   lib/store.ts (Supabase app_state[STATE_ID] | file)
```

### Tok session
1. Klik na **Povídat** → `POST /api/sessions {mode:"voice"}`. Server:
   - vytvoří session;
   - zavolá `buildMemory()`;
   - namintuje token (`GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=…`, hlavička `xi-api-key`, odpověď `{ token }`);
   - vrátí `{ session, memory, dynamicVariables, conversationToken }`.
2. Klient zavolá `startSession({ conversationToken, connectionType: "webrtc", dynamicVariables })`. **Posílají se vždy všechny proměnné**, i prázdné (`"Žádné."`). Chybějící proměnná shodí start.
3. `onMessage` → `POST /turns {role, text, clientSeq}`. Server řadí podle `clientSeq` a deduplikuje podle `(sessionId, clientSeq)`, **ne podle textu**.
4. `onConnect({conversationId})` → uložit `elConversationId`.
5. Klik na **Skončit** nebo `onDisconnect` (agent může hovor ukončit sám) → `POST /finalize`. Idempotentní: když už je `done`, vrátí uložený výsledek.
6. UI ukáže „Zapisuji vzpomínky…“ a pak kartu **„Příště se zeptám na: …“** (vizuální důkaz paměti). Timeout je 40 s, pak tlačítko „Načíst připravený výsledek“ (`after-s2`).

---

## 4. Adresářová struktura a vlastnictví

```
/
├─ AGENTS.md                         [WP0] pravidla pro subagenty
├─ README.md                         [WP6]
├─ docs/PLAN.md, docs/CONTRACTS.md   [WP0]
├─ docs/CONTRACT_REQUESTS.md         [kdokoli, jen přidává]
├─ docs/DEMO.md                      [WP5] scénář + pitch EN
├─ .env.example, .gitignore, render.yaml, .node-version   [WP0]
├─ app/
│  ├─ layout.tsx, globals.css        [WP0] teplá papírová paleta, 18px základ
│  ├─ page.tsx                       [WP1] senior „Povídat“
│  ├─ rodina/
│  │  ├─ layout.tsx, page.tsx        [WP4] přehled
│  │  ├─ kniha/page.tsx              [WP4]
│  │  ├─ povidani/[id]/page.tsx      [WP4]
│  │  ├─ lide/page.tsx               [WP3]
│  │  └─ strom/page.tsx              [WP3]
│  ├─ demo/page.tsx                  [WP5]
│  └─ api/
│     ├─ health/route.ts                    [WP0] stav klíčů (bool), STORE, STATE_ID
│     ├─ sessions/route.ts                  [WP2] POST start (volá lib/elevenlabs.ts z WP1), GET list
│     ├─ sessions/[id]/route.ts             [WP2] GET detail
│     ├─ sessions/[id]/turns/route.ts       [WP2]
│     ├─ sessions/[id]/finalize/route.ts    [WP2]
│     ├─ memory/route.ts                    [WP2]
│     ├─ chat/route.ts                      [WP2]
│     ├─ tts/route.ts                       [WP1]
│     ├─ el-token/route.ts                  [WP1] (debug)
│     ├─ chapters/route.ts                  [WP2] GET list
│     ├─ chapters/generate/route.ts         [WP2]
│     ├─ chapters/[id]/route.ts             [WP2] PATCH
│     ├─ entities/route.ts                  [WP2]
│     ├─ tree/route.ts                      [WP3]
│     ├─ matches/route.ts                   [WP3] GET, POST přepočet
│     ├─ matches/[id]/route.ts              [WP3] POST {action}
│     ├─ export/gedcom/route.ts             [WP3]
│     └─ demo/load/route.ts                 [WP5]
├─ components/
│  ├─ ui/*                           [WP0] Button, Card, Badge
│  ├─ talk/*                         [WP1] TalkButton, StatusOrb, Captions, TextFallback, NextTimeCard, MemoryPeek
│  ├─ book/*                         [WP4] ChapterView, CitationChip, ParagraphEditor
│  ├─ people/*                       [WP3] EntityTable, MatchCard
│  └─ tree/*                         [WP3] FamilyTree, PersonCard
├─ lib/
│  ├─ types.ts                       [WP0, ZMRAZENO]
│  ├─ schemas.ts                     [WP0, ZMRAZENO] zod pro LLM výstupy
│  ├─ store.ts                       [WP0, ZMRAZENO] getDb/updateDb/loadSnapshot
│  ├─ llm.ts                         [WP0 kostra, WP2 implementace] llmStructured/llmText
│  ├─ api-client.ts                  [WP0] typované fetch wrappery
│  ├─ ids.ts, topics.ts              [WP0]
│  ├─ elevenlabs.ts                  [WP1] mintToken(), tts()
│  ├─ prompts/grandchild.ts          [WP2] šablona + renderGrandchildPrompt + GRANDCHILD_VARIABLES
│  ├─ prompts/summarizer.ts, extractor.ts, chapter.ts  [WP2]
│  ├─ memory.ts                      [WP2] buildMemory()
│  ├─ pipeline.ts                    [WP2] finalizeSession()
│  ├─ chapters.ts                    [WP2] generateChapter(), validateCitations()
│  ├─ entities.ts                    [WP2] mergeEntities()
│  ├─ matching/{normalize,diminutives,jaroWinkler,match}.ts  [WP3]
│  ├─ gedcom.ts                      [WP3]
│  └─ treeLayout.ts                  [WP3]
├─ data/
│  ├─ fake-tree.json                 [WP3]
│  ├─ fixtures/{summary,extraction,chapter,chat}.json  [WP0 kostra, WP2 doladí]
│  └─ snapshots/{empty,after-s1,after-s2}.json         [WP0 empty; WP5 after-*]
├─ scripts/
│  ├─ create-agent.ts                [WP1] (timebox 10 min)
│  ├─ smoke-llm.ts                   [WP2]
│  ├─ save-snapshot.ts               [WP5]
│  └─ export-sample-ged.ts           [WP3]
└─ tests/{store,memory,prompts,citations,matching,gedcom,snapshots,treeLayout}.test.ts  [vlastník = WP daného modulu]
```

---

## 5. Datový model (`lib/types.ts`, zmrazeno ve WP0)

```ts
export type ISODate = string;
export type LifeTopicKey = "detstvi" | "skola" | "vojna" | "prace" | "laska" | "deti" | "moudrost";

export interface Grandparent {
  id: string;               // "jaroslav"
  displayName: string;      // "děda Jarda"
  fullName: string;         // "Jaroslav Novák"
  birthYear: number;        // 1946
  birthPlace: string;       // "Kladno"
  sex: "M" | "F";
  treePersonId: string;     // "I1"
  grandchildName: string;   // "Tomáš"
}

export interface Session {
  id: string;               // "s1", "s2"
  grandparentId: string;
  index: number;
  startedAt: ISODate; endedAt: ISODate | null;
  mode: "voice" | "text";
  status: "live" | "finalizing" | "done" | "failed";
  elConversationId: string | null;
  firstMessage: string;     // co měl agent říct jako první (pro /demo kontrolu paměti)
  continuedThreadId: string | null; // badge „navázáno na…“
}

export interface Turn {
  id: string;               // `${sessionId}-t${NN}`, např. "s1-t07" – citovatelné
  sessionId: string;
  idx: number;              // přiděleno serverem podle clientSeq
  clientSeq: number;        // monotónní z klienta; dedupe klíč
  role: "grandparent" | "ai";
  text: string;
  at: ISODate;
}

export interface OpenThread {
  id: string;               // "th-xxxx"
  title: string;            // "Útěk s Pepou na pouť do Prahy"
  whyUnfinished: string;
  turnIds: string[];
  createdInSession: string;
  resolvedInSession: string | null;
  source: "summary" | "chapter";
}

export interface SessionSummary {
  sessionId: string;
  summary: string;
  topicsCovered: LifeTopicKey[];
  newOpenThreads: Omit<OpenThread, "id" | "createdInSession" | "resolvedInSession" | "source">[];
  resolvedThreadIds: string[];
  nextTopic: string;
  nextSessionOpener: string;
  keyFacts: string[];
}

export interface Citation { turnId: string; quote: string }  // quote doplní server (prvních 160 znaků)

export interface ChapterParagraph {
  id: string;
  text: string;
  citations: Citation[];
  verified: boolean;        // false = žádná platná citace NEBO rok/jméno chybí v citovaných turnech
  warnings: string[];       // např. "Rok 1957 nezazněl v citovaných replikách"
  editedByFamily: boolean;
}

export interface Chapter {
  id: string; key: LifeTopicKey; title: string;
  paragraphs: ChapterParagraph[];
  openQuestions: string[];
  status: "draft" | "approved";
  generatedAt: ISODate; model: string;
}

export interface PersonEntity {
  id: string;
  mentionName: string;      // "Pepa Dvořák"
  givenName: string | null; // "Pepa" – přezdívka zůstává, převod dělá matching
  surname: string | null;
  sex: "M" | "F" | null;
  birthYear: number | null;
  birthYearApprox: boolean;
  place: string | null;
  relationToGrandparent: string;
  notes: string;
  turnIds: string[];
}
export interface PlaceEntity { id: string; name: string; context: string; turnIds: string[] }
export interface EventEntity {
  id: string; title: string; year: number | null; yearApprox: boolean;
  description: string; personIds: string[]; placeIds: string[]; turnIds: string[];
}

export interface TreePerson {
  id: string;               // "I1".."I16" = GEDCOM xref
  givenName: string; surname: string; birthSurname: string | null;
  nickname: string | null; sex: "M" | "F";
  birthYear: number | null; birthPlace: string | null; deathYear: number | null;
  occupation: string | null;
  generation: number;       // 0 = nejstarší
}
export interface TreeFamily {
  id: string; husbandId: string | null; wifeId: string | null; childIds: string[];
  marriageYear: number | null; marriagePlace: string | null;
}
export interface FamilyTree { name: string; source: string; persons: TreePerson[]; families: TreeFamily[] }

export interface Match {
  id: string;
  entityId: string;
  treePersonId: string;
  score: number;
  breakdown: { given: number; surname: number | null; year: number | null; place: number | null };
  gates: string[];          // uplatněné brány: "surname-mismatch-cap", "year-gap-cap", "no-surname-cap"
  band: "strong" | "possible";
  reason: string;
  alsoConsidered: { treePersonId: string; score: number; why: string }[];
  status: "suggested" | "confirmed" | "rejected";
}

export interface Db {
  version: 1;
  grandparent: Grandparent;
  sessions: Session[]; turns: Turn[];
  summaries: SessionSummary[]; threads: OpenThread[];
  chapters: Chapter[];
  persons: PersonEntity[]; places: PlaceEntity[]; events: EventEntity[];
  tree: FamilyTree; matches: Match[];
}

export interface MemoryContext {
  grandparentName: string; grandchildName: string; birthYear: number;
  sessionNo: number; isFirstSession: boolean;
  memorySummary: string; knownPeople: string; openThreads: string;
  nextTopic: string; uncoveredTopics: string; firstMessage: string;
  continuedThreadId: string | null;
}
```

### Store API (`lib/store.ts`)
- `getDb(): Promise<Db>`
- `updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T>`
  - in-process mutex;
  - v Supabase optimistická kontrola `version`: `update … eq("id", STATE_ID).eq("version", v)`, při 0 řádcích reload a retry max. 3×;
  - v file režimu zápis do tmp souboru + `rename`.
- `loadSnapshot(name)`: načte `data/snapshots/<name>.json` přes `path.join(process.cwd(), …)` a přepíše stav.
- Chybí-li řádka `STATE_ID`, automaticky se nahraje `after-s1` (případně `empty`).

### LLM API (`lib/llm.ts`)
```ts
llmStructured<T>(opts: { task: "summary"|"extract"|"chapter"; schema: ZodType<T>; system: string; user: string; writer?: boolean }): Promise<{ data: T; provider: string; model: string; ms: number }>
llmText(opts: { system: string; messages: { role: "user"|"assistant"; content: string }[]; maxTokens?: number }): Promise<string>
```
- **OpenAI:** `client.chat.completions.parse({ model, messages:[{role:"system",…},{role:"user",…}], response_format: zodResponseFormat(schema, task) })` → `choices[0].message.parsed`.
  - Hodnota `null` nebo `refusal` → 1 retry → Gemini.
- **Gemini:** `ai.models.generateContent({ model, contents: user, config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(schema) } })` → `schema.parse(JSON.parse(res.text))`.
  - Název pole (`responseJsonSchema` vs. `responseSchema`) ověřit v Context7.
- `MOCK_AI=1` → `data/fixtures/<task>.json`.

### Všeobecná pravidla pro Next.js (do AGENTS.md)
- `params` v pages i route handlerech je `Promise`: `{ params }: { params: Promise<{ id: string }> }` a pak `const { id } = await params`.
- **Každá stránka a GET route, která čte store, má `export const dynamic = "force-dynamic"`**, jinak se prerenderuje při buildu se starými daty.
- Práce na pozadí po odpovědi se dělá přes `after()` z `next/server`.
- Klíče se používají jen v server kódu, nikdy s prefixem `NEXT_PUBLIC_`.

---

## 6. API routes (kontrakty)

| Route | Vstup | Výstup | P |
|---|---|---|---|
| `GET /api/health` | – | `{ openai, gemini, elevenlabs, supabase: bool, store, stateId, models }` | P0 |
| `POST /api/sessions` | `{ mode: "voice"\|"text" }` | `{ session, memory: MemoryContext, dynamicVariables: Record<string,string>, conversationToken: string\|null }` | P0 |
| `GET /api/sessions` / `GET /api/sessions/:id` | – | `Session[]` / `{ session, turns, summary }` | P0 |
| `POST /api/sessions/:id/turns` | `{ role, text, clientSeq }` | `{ turn }` | P0 |
| `POST /api/sessions/:id/finalize` | `{ generateChapter?: LifeTopicKey }` | `{ summary, threads, persons, matches, chapter?, nextTopic }`, při chybě `500 { error, fallbackSnapshot: "after-s2" }` | P0 |
| `GET /api/memory` | – | `{ memory, dynamicVariables, systemPrompt }` | P0 |
| `POST /api/chat` | `{ sessionId, text, clientSeq }` | `{ reply, turns }`. Uloží oba turny. Když je session prázdná a `text` je `""`, vrátí `firstMessage`. | P0 |
| `POST /api/tts` | `{ text }` | `audio/mpeg` | P1 |
| `GET /api/chapters` | – | `Chapter[]` | P0 |
| `POST /api/chapters/generate` | `{ key }` | `Chapter` | P0 |
| `PATCH /api/chapters/:id` | `{ paragraphId, text }` nebo `{ status: "approved" }` | `Chapter` | P1 |
| `GET /api/entities` | – | `{ persons, places, events }` | P0 |
| `GET /api/tree` | – | `{ tree, matches, confirmedByTreeId: Record<string, {entity, citations}> }` | P0 |
| `GET /api/matches` / `POST /api/matches` | – | `Match[]` (POST přepočítá) | P0 |
| `POST /api/matches/:id` | `{ action: "confirm"\|"reject" }` | `Match` | P0 |
| `GET /api/export/gedcom` | `?includeUnmatched=0\|1` | `text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="rodokmen-novakovi.ged"` | P1 |
| `POST /api/demo/load` | `{ snapshot: "empty"\|"after-s1"\|"after-s2" }` | `{ ok }` | P0 |

**Kontrakt pro WP2 → WP3:** `suggestMatches(persons: PersonEntity[], tree: FamilyTree, exclude: string[], previous: Match[]): Match[]`.
- WP0 vytvoří stub, který vrací `[]`.
- Potvrzené a zamítnuté shody z `previous` se zachovají.

---

## 7. Prompty (česky)

### 7.1 Zvídavé vnouče: system prompt agenta (`lib/prompts/grandchild.ts`, jediný zdroj pravdy)
Šablona obsahuje `{{placeholdery}}`:
- `scripts/create-agent.ts` ji nahraje do ElevenLabs beze změny (ElevenLabs dosadí dynamicVariables);
- `/api/chat` ji dosadí v kódu přes `renderGrandchildPrompt(mem)`.

`GRANDCHILD_VARIABLES` = `["grandchild_name","grandparent_name","birth_year","session_no","memory_summary","known_people","open_threads","next_topic","uncovered_topics","first_message"]`.

Test ověří, že šablona neobsahuje jiné placeholdery a že `buildDynamicVariables()` vrací všechny klíče jako neprázdné stringy.

```
Jsi {{grandchild_name}}, zvídavý, trpělivý a laskavý vnuk. Povídáš si se svým dědou – jmenuje se {{grandparent_name}} a narodil se v roce {{birth_year}}. Společně sepisujete jeho životní příběh pro celou rodinu, aby jeho vzpomínky nezmizely. Tohle je vaše povídání číslo {{session_no}}.

JAK MLUVÍŠ
- Mluvíš česky, přirozeně a vřele. Dědovi tykáš a oslovuješ ho „dědo“. Jsi kluk, o sobě mluvíš v mužském rodě („byl jsem“, „rád bych“).
- Odpovídej krátce: nejvýš dvě krátké věty reakce a potom JEDNA otázka. Nikdy nepokládej víc otázek najednou.
- Tvoje slova se čtou nahlas: žádné seznamy, odrážky, závorky, emoji ani zkratky. Letopočty říkej přirozeně („v padesátém osmém“).
- Nejdřív ukaž, že posloucháš – zopakuj jeden konkrétní detail, který děda řekl – a teprve pak se zeptej.
- Děda je starší pán, může mluvit pomaleji a dělat pauzy. Nespěchej a neskákej mu do řeči.

NA CO SE PTÁŠ
- Na konkrétní detaily: kdo u toho byl, kde přesně to bylo, kolik mu bylo, jak to tam vypadalo, jak to vonělo, co cítil.
- Když zmíní nového člověka, nenápadně zjisti celé jméno, odkud byl a zhruba kdy se narodil. Třeba: „A Pepa byl starší, nebo mladší než ty?“ Stačí jednou, ne jako výslech.
- Když řekne rok nebo místo nejasně, jemně se doptej: „To bylo ještě na Kladně?“
- Když odbočí, nech ho – je to jeho příběh. Potom se vrať k tomu, co nedořekl.

CO NIKDY NEDĚLÁŠ
- Nic si o jeho životě nevymýšlíš a nedoplňuješ fakta, která neřekl.
- Neopravuješ ho, nehodnotíš, nemoralizuješ a nemluvíš o politice.
- Neptáš se znovu na věci, které už víme. Místo toho na ně navazuješ: „Minule jsi říkal, že…“
- Když je smutný nebo se odmlčí, dej mu čas, projev pochopení a nabídni lehčí téma.
- Neříkáš, že jsi umělá inteligence, pokud se sám nezeptá. Když se zeptá, vlídně to přiznej.

CO UŽ VÍME Z MINULÝCH POVÍDÁNÍ
{{memory_summary}}

LIDÉ, O KTERÝCH UŽ VÍME
{{known_people}}

NEDOVYPRÁVĚNÉ PŘÍBĚHY
{{open_threads}}

PLÁN NA DNES
Svou úvodní větu už jsi řekl: „{{first_message}}“. Navaž na dědovu odpověď.
Nejdřív ať dovypráví tohle: {{next_topic}}.
Až to dovypráví, plynule přejdi k tématu, o kterém zatím nic nevíme: {{uncovered_topics}}.
Když děda řekne, že už musí končit nebo je unavený, jednou větou shrň, co ses dnes dozvěděl, poděkuj mu a řekni, na co se těšíš příště.
```

- **First message agenta** (nastavení v agentovi): `{{first_message}}`.
- **Nastavení agenta:**
  - jazyk `cs`;
  - mužský český hlas;
  - TTS `eleven_flash_v2_5`;
  - LLM Claude Haiku 4.5;
  - nízká teplota;
  - turn eagerness „patient“ nebo delší turn timeout;
  - max. délka hovoru 10 min.

### 7.2 Shrnutí session (`summarizer.ts`, `llmStructured` task `summary`, `SessionSummarySchema`)
Vstup:
- přepis ve formátu `[s2-t04] DĚDA: …` / `[s2-t05] VNUK: …`;
- otevřená vlákna s ID;
- dosavadní keyFacts.

```
Jsi pečlivý archivář rodinné paměti. Dostaneš přepis dnešního povídání vnuka Tomáše s dědou Jaroslavem (každá replika má ID v hranatých závorkách), seznam dosud nedovyprávěných příběhů s jejich ID a fakta, která už známe.

Vrať JSON podle schématu:
1. summary: 3–5 vět česky ve třetí osobě, co děda dnes vyprávěl. Jen fakta z přepisu.
2. topicsCovered: které klíče z [detstvi, skola, vojna, prace, laska, deti, moudrost] dnes zazněly aspoň jedním konkrétním příběhem.
3. newOpenThreads: příběhy, které děda začal a nedokončil („to ti povím příště“, odbočil, chybí konec), nebo otázky vnuka, na které děda neodpověděl. Každý má title (krátký titulek), whyUnfinished (co chybí) a turnIds (ID replik, kde příběh začal).
4. resolvedThreadIds: ID dřívějších vláken, která děda dnes dovyprávěl. Používej jen ID ze seznamu.
5. nextTopic: jedna konkrétní věc, na kterou se příště zeptat jako první. Přednostně nedokončený příběh, jinak nové životní téma.
6. nextSessionOpener: první věta vnuka v příštím povídání. Tyká, oslovuje „dědo“, mluví v mužském rodě, připomene konkrétní detail z dneška a končí jednou otázkou. Nejvýš 2 věty. Příklad stylu: „Ahoj dědo! Minule jsi mi začal vyprávět, jak jste s Pepou utekli na pouť do Prahy – tak jak to doma dopadlo?“
7. keyFacts: nejvýš 8 krátkých faktů (jména, roky, místa), která si má vnuk pamatovat.

Nic si nevymýšlej. Co v přepisu nezaznělo, neuváděj. Používej jen ID replik, která v přepisu existují.
```

### 7.3 Extraktor entit (`extractor.ts`, task `extract`, `ExtractionSchema`)
Vstup:
- přepis s ID;
- seznam známých osob `id | mentionName | relace`;
- rok a místo narození dědy.

```
Z přepisu rozhovoru s dědou Jaroslavem (narozen {{birthYear}}, {{birthPlace}}) vytáhni strukturovaná data pro rodokmen. Vše česky. Děda sám a vnuk Tomáš NEJSOU v seznamu osob.

persons – každý konkrétní zmíněný člověk, i když zazněla jen přezdívka:
- mentionName: přesně jak zaznělo („Pepa Dvořák“, „maminka“).
- givenName: křestní jméno nebo přezdívka tak, jak zazněla („Pepa“). Přezdívku NEPŘEVÁDĚJ na plné jméno – to dělá jiný systém. Když zazní jen vztah („maminka“) a jméno ne, dej null.
- surname: příjmení, pokud zaznělo, jinak null.
- sex: jen když je jasné z gramatiky nebo jména, jinak null.
- birthYear: jen když zaznělo, nebo jde přímo spočítat z věty typu „byl o dva roky mladší než já“ (děda je z roku {{birthYear}}). Když je rok spočítaný nebo zazní „asi“ či „kolem“, nastav birthYearApprox na true.
- place: odkud osoba je nebo kde žila, jinak null.
- relationToGrandparent: vztah k dědovi („kamarád z dětství, soused“).
- notes: jedna věta o tom, co o něm víme.
- existingId: pokud jde o osobu ze seznamu ZNÁMÉ OSOBY, vyplň její id, jinak null.
- turnIds: ID replik, kde osoba zazněla.

places – obce, čtvrti, podniky („huť Poldi“), každé s kontextem a turnIds.
events – události s rokem (year a yearApprox), jmény zúčastněných osob (mentionName) a názvy míst, s popisem a turnIds.

Pravidla: jen to, co v přepisu skutečně zaznělo. Nejisté hodnoty dej null. Každá položka musí mít aspoň jedno turnId, které v přepisu existuje. Stejnou osobu zmíněnou víckrát uveď jen jednou.
```

Po extrakci kód spustí `mergeEntities`:
- slučuje podle `existingId`, jinak podle normalizovaného jména a příjmení;
- zahodí neexistující turnIds;
- položku bez turnIds zahodí.

### 7.4 Autor kapitoly (`chapter.ts`, task `chapter`, `writer: true`, `ChapterSchema`)
Vstup:
- label kapitoly;
- **jen repliky dědy** s ID (repliky vnuka jen jako kontext v samostatném bloku označeném „OTÁZKY – NEJSOU ZDROJ“);
- keyFacts.

```
Píšeš kapitolu „{{label}}“ do knihy vzpomínek dědy Jaroslava Nováka pro jeho rodinu.

Styl: první osoba, dědovým hlasem („Narodil jsem se…“). Prostě, vřele, bez patosu a bez knižních frází. Zachovej jeho výrazy a hlášky, jednu až dvě krátké doslovné citace dej do uvozovek. Napiš 3–6 odstavců. Titulek je krátký, obrazný a osobní (ne „Dětství“, ale třeba „Kluk od komínů Poldovky“).

PRAVIDLA PRAVDIVOSTI – nejdůležitější:
- Používej JEN to, co děda v replikách řekl. Nic nedomýšlej, nepřidávej dobové reálie, jména, roky, místa ani pocity, které nezazněly.
- Každý odstavec MUSÍ mít v citations ID dědových replik (formát „s1-t07“), ze kterých čerpá. Odstavec bez opory v přepisu nepiš.
- Otázky vnuka nejsou zdroj faktů.
- Každý rok a každé vlastní jméno v odstavci musí doslova zaznít v citovaných replikách.
- Co chybí nebo si odporuje, nepiš do textu – dej to do openQuestions jako otázku na příště.
- Když je materiálu málo, napiš kratší kapitolu. Kratší a pravdivé je lepší.
```

**Schéma:** `{ title, paragraphs: [{ text, citations: string[] }], openQuestions: string[] }`.

`validateCitations(chapter, turns)` v kódu:
1. Zahodí citace neexistujících turnů a turnů role `ai`.
2. Doplní `quote` (prvních 160 znaků turnu).
3. Pokud nezbude žádná citace, nastaví `verified: false`.
4. **Kontrola roků a jmen:** každé čtyřmístné číslo `19xx`/`20xx` a každé slovo s velkým písmenem, které není na začátku věty (po odstranění diakritiky a normalizaci), musí být v textu citovaných turnů. Jinak se do `warnings` přidá položka a nastaví `verified: false`.
5. `openQuestions` se přidají jako `OpenThread` se zdrojem `chapter`.

### 7.5 Textový chat (`/api/chat`)
- `llmText({ system: renderGrandchildPrompt(mem), messages: turny session (grandparent→user, ai→assistant), maxTokens: 300 })`.
- Mem je MemoryContext uložený při startu session, ne přepočítaný.

---

## 8. Paměť napříč sessions

### Zápis (`finalizeSession`)
1. `Promise.all([summarize, extract])`.
2. Uloží se summary. `newOpenThreads` → `threads`. U `resolvedThreadIds` se nastaví `resolvedInSession`.
3. `mergeEntities` → `suggestMatches`.
4. Volitelně `generateChapter(key)` přes `after()`.
5. Status `done`.

### Čtení (`buildMemory()`, deterministicky, bez LLM)
- **`memorySummary`:** „Povídání 1 (30. 9.): …“ chronologicky, pak „Důležité: “ + unikátní keyFacts. Ořez na ~1 500 znaků, starší shrnutí se zkracují na první větu.
- **`knownPeople`:** „Pepa Dvořák (kamarád z dětství, Kladno, asi 1948); maminka Anna; …“, max. 10 osob.
- **`openThreads`:** nevyřešená vlákna jako věty „Útěk s Pepou na pouť do Prahy – nedořekl, jak to doma dopadlo.“, jinak „Žádné.“
- **`nextTopic`:** `nextTopic` z posledního summary, jinak title prvního otevřeného vlákna, jinak label prvního nepokrytého tématu.
- **`uncoveredTopics`:** labely `LIFE_TOPICS` minus sjednocení `topicsCovered`.
- **`firstMessage`:** `nextSessionOpener` z posledního summary. Při první session: „Ahoj dědo, to jsem já, Tomáš. Moc rád bych si s tebou povídal o tom, jak jsi byl malý. Kde jsi vyrůstal?“
- **`continuedThreadId`:** id vlákna, na které opener odkazuje (první otevřené).

### Důkaz paměti pro porotu
- Session 2 začne větou o nedovyprávěném příběhu.
- Na `/` je rozbalovací „Co si z minula pamatuju“ (EN label „What the AI remembers“).
- Na `/demo` je kontrolka: **první AI turn session == `session.firstMessage`**. Při neshodě se ukáže červený odznak, protože injekce proměnných selhala.
- Na přehledu session je odznak „navázáno na: …“.

---

## 9. Falešný strom a párování Pepy

### Persona
- Děda **Jaroslav Novák**, *1946 Kladno, hutník v Poldi, vojna 1965–67 v Jihlavě.
- AI je vnuk **Tomáš** (I10) a dědovi tyká.

### `data/fake-tree.json` („Rodokmen Novákových – ukázkový import z MyHeritage“)

| ID | Osoba | Gen |
|---|---|---|
| I1 | **Jaroslav Novák**, M, *1946 Kladno, hutník | 1 |
| I2 | Marie Nováková roz. Svobodová, F, *1949 Slaný | 1 |
| I3 | František Novák, M, *1919 Kladno, †1988 | 0 |
| I4 | Anna Nováková roz. Horáková, F, *1922 Rakovník, †2001 | 0 |
| I5 | Věra Dvořáková roz. Nováková, F, *1950 Kladno | 1 |
| I6 | **Josef Dvořák**, M, *1948 Kladno, zámečník. **Správná shoda pro Pepu** | 1 |
| I7 | Petr Dvořák, M, *1974 Kladno | 2 |
| I8 | Jan Novák, M, *1972 Kladno | 2 |
| I9 | Eva Černá roz. Nováková, F, *1975 Praha | 2 |
| I10 | Tomáš Novák, M, *2001 Praha (persona AI) | 3 |
| I11 | Kateřina Černá, F, *2004 Praha | 3 |
| I12 | **Josef Novák**, M, *1924 Kladno, †1990, strýc. **Návnada**: stejné místo, špatný rok a příjmení | 0 |
| I13 | **Josef Horák**, M, *1946 Rakovník, bratranec. **Návnada**: podobné příjmení a rok, jiné místo | 1 |
| I14 | Martin Černý, M, *1973 Praha | 2 |
| I15 | Lucie Nováková roz. Králová, F, *1974 Praha | 2 |
| I16 | Karel Horák, M, *1920 Rakovník (bratr Anny) | 0 |

**Rodiny (explicitně):**
- F1: I3 + I4, svatba 1945 Kladno, děti I1, I5
- F2: I1 + I2, svatba 1970 Kladno, děti I8, I9
- F3: I6 + I5, svatba 1972 Kladno, dítě I7
- F4: I8 + I15, dítě I10
- F5: I14 + I9, dítě I11
- F6: bez rodičů, děti I3, I12 (sourozenci)
- F7: I16, dítě I13
- F8: bez rodičů, děti I4, I16

**Vstup ze session 1:** „Pepa Dvořák, ten bydlel o dům vedle, byl o dva roky mladší než já.“ Extrakce vrátí `{givenName:"Pepa", surname:"Dvořák", sex:"M", birthYear:1948, birthYearApprox:true, place:"Kladno"}`.

### Algoritmus (`lib/matching/match.ts`, opravené brány)
1. **`normalize`:** trim, lowercase, `NFD` a odstranění diakritiky, sloučení mezer.
2. **Křestní jméno:** reverse lookup v `DIMINUTIVES`.
   - Slovník se převezme z research, **vyčištěný od `?` hacků, `"Josef Jr."` a duplicit**.
   - Víceznačnost se řeší pohlavím.
   - Kanonická shoda = 1.0. Zbylá víceznačnost = 0.9. Jinak Jaro-Winkler kanonických tvarů. Pokud je kandidátův `nickname` shodný, skóre je 1.0.
3. **Příjmení:** základ tvaru (`-ová` → základ, `-á` → `-ý`), porovnává se se `surname` i `birthSurname` kandidáta a bere se max.
   - **JW < 0.85 se počítá jako 0.**
   - Chybí-li příjmení v mention, váha se vypustí.
4. **Rok:** `Δeff = max(0, |Δ| − (approx ? 2 : 0))`. Δeff 0 → 1.0, ≤1 → 0.8, ≤3 → 0.5, ≤5 → 0.2, jinak 0.
5. **Místo:** shoda = 1.0, podřetězec = 0.5, jinak 0. Neznámé místo → váha se vypustí.
6. **Váhy** `0.35 given + 0.30 surname + 0.25 year + 0.10 place`, přenormované přes přítomná pole.
7. **Brány (tvrdé):**
   - rozdílné pohlaví → vyřadit;
   - `exclude` (děda I1 a vnuk I10) → vyřadit;
   - obě příjmení známá a surname skóre = 0 → `total = min(total, 0.5)` (`surname-mismatch-cap`);
   - oba roky známé a |Δ| > 10 → `total = min(total, 0.5)` (`year-gap-cap`);
   - mention bez příjmení → `total = min(total, 0.9)` (`no-surname-cap`).
8. **Prahy:** ≥ 0.85 `strong`, 0.65–0.85 `possible`, pod 0.65 se nic nenavrhuje.
   - Návrh se dělá **jen pro top-1**. Další kandidáti nad 0.3 jdou do `alsoConsidered` s důvodem.
   - Vždy potvrzuje člověk.

### Ručně přepočtená očekávání (test)
- **I6 Josef Dvořák 1948 Kladno:** given 1.0, surname 1.0, year 1.0, place 1.0 → **1.00**, strong.
- **I12 Josef Novák 1924 Kladno:** given 1.0, JW(dvorak, novak) < 0.85 → 0, year 0. Surový součet 0.35 + 0 + 0 + 0.10 = 0.45, obě brány (cap 0.5) → **≤ 0.45**, nenavrženo.
- **I13 Josef Horák 1946 Rakovník:** JW(dvorak, horak) ≈ 0.822 < 0.85 → 0, surname-cap. Surový 0.35 + 0 + 0.25 + 0 = 0.60, s capem **≤ 0.50**, nenavrženo.
- „Honza“ → Jan; „Nováková“ ~ „Novák“ (1.0); „Jožka“ + F → Josefa; rozdílné pohlaví → vyřazení; `jaroWinkler("martha","marhta") ≈ 0.961`.

**`reason`:** „Pepa → Josef (zdrobnělina) · Dvořák = Dvořák · 1948 ≈ asi 1948 · Kladno ✓“. `alsoConsidered`: „Josef Novák *1924 – jiné příjmení, rok o 24 let jinde“.

**Po potvrzení:**
- uzel I6 ve stromě má odznak „ze vzpomínek“ a klik ukáže citace;
- GEDCOM připojí NOTE k I6 a `NICK Pepa`.

---

## 10. GEDCOM export (`lib/gedcom.ts`, 5.5.1)

- **Hlavička:** `0 HEAD` / `1 SOUR AI_ZIVOTOPISEC` (`2 VERS 0.1`, `2 NAME AI životopisec pro prarodiče`) / `1 DATE 30 SEP 2026` / `1 SUBM @U1@` / `1 GEDC` / `2 VERS 5.5.1` / `2 FORM LINEAGE-LINKED` / `1 CHAR UTF-8` / `1 LANG Czech`. Dále `0 @U1@ SUBM` / `1 NAME Rodina Novákových`. Konec `0 TRLR`.
- **Formát souboru:** CRLF, UTF-8 s BOM.
- **INDI (pro každou TreePerson):**
  - `1 NAME Given /Surname/`, `2 GIVN`, `2 SURN`, `2 NICK` (u I6 z potvrzené shody: Pepa);
  - u žen s `birthSurname` druhé `1 NAME Given /BirthSurname/` + `2 TYPE maiden`;
  - `1 SEX`, `1 BIRT` / `2 DATE <rok>` (`ABT` u přibližných) / `2 PLAC`, `1 DEAT` / `2 DATE`, `1 OCCU`;
  - `1 FAMS`/`1 FAMC` oboustranně podle families.
- **FAM:** `HUSB`/`WIFE`/`CHIL`, `1 MARR` / `2 DATE` / `2 PLAC`.
- **Příběhy:**
  - Každá kapitola je sdílený `0 @Nk@ NOTE` s titulkem a odstavci. INDI I1 na ni odkazuje přes `1 NOTE @Nk@`.
  - Každá potvrzená shoda přidá sdílený NOTE „Ve vyprávění dědy Jaroslava: …“ s citacemi `[s1-t07]`, odkázaný z odpovídající INDI.
- **Zdroj:** `0 @S1@ SOUR` / `1 TITL Rozhovory s Jaroslavem Novákem (AI životopisec)` / `1 PUBL Nahráno 2026, přepsáno automaticky`. INDI s potvrzeným příběhem mají `1 SOUR @S1@` / `2 PAGE povídání 1, replika s1-t07`.
- **`noteLines(level, text)`:**
  - `CONT` na každý odstavec (prázdný odstavec = `n CONT` bez hodnoty);
  - `CONC` po ≤ 200 znacích, **řez nikdy vedle mezery** (posun doleva, dokud oba sousední znaky nejsou mezery);
  - `@` se escapuje na `@@`.
- **`includeUnmatched=1`:** nespárované PersonEntity jako nové INDI `@X1@…` s NOTE „Zmíněn ve vyprávění: {relation}. Neověřeno.“
- **Testy:**
  - každý řádek ≤ 255 B (`Buffer.byteLength`);
  - začíná `0 HEAD`, končí `0 TRLR`;
  - každý xref použitý v FAM existuje;
  - žádná CONC hodnota nezačíná ani nekončí mezerou;
  - round-trip přes `read-gedcom`: počet INDI (16) a FAM (8) sedí, jméno I6 obsahuje „Dvořák“, po potvrzené shodě NOTE obsahuje „Pepa“, diakritika „Dvořáková“ přežije.
- **V pitchi říct jen:** „standardní GEDCOM 5.5.1 pro import do MyHeritage/Geni“. Že import funguje, tvrdit jen tehdy, když jsme ho opravdu zkusili.

---

## 11. UI stránky

**Styl:** Tailwind v4, teplá papírová paleta (krémová, tmavě hnědá, cihlový akcent), základní font 18 px. Kniha má serif. Bez dark mode.

1. **`/` Povídat (senior, WP1)**
   - „Ahoj, dědo Jardo“ a obří kulaté tlačítko **Povídat** (≥ 40 % výšky, text 32 px).
   - `StatusOrb`: „Připojuji…“ / „Poslouchám“ / „Mluví Tomáš“.
   - `Captions`: poslední 2 repliky, ≥ 28 px.
     - P1: pod AI replikou menší anglický překlad (`/api/chat?translate` nebo samostatné `llmText`, jen když `?en=1`).
   - Tlačítko **Skončit** → „Děkuji, dědo. Zapisuji vzpomínky…“ → `NextTimeCard` „Příště se zeptám na: …“ + odkaz „Co vzniklo pro rodinu“.
   - Nenápadný přepínač „Psát místo mluvení“. Otevře se automaticky při chybě mikrofonu nebo tokenu nebo když do 8 s nepřijde zvuk.
     - `TextFallback`: textarea → `/api/chat`, odpověď velkým písmem a `/api/tts` do `<audio>`.
   - Rozbalovací `MemoryPeek` „Co si z minula pamatuju / What the AI remembers“.
   - `?warm=1`: připojí se hned a čeká (pre-warm na 60s pitch).
2. **`/rodina` přehled (WP4):** karty
   - povídání (datum, shrnutí, počet replik, odznak „navázáno na…“);
   - kapitoly (tlačítko „Napsat kapitolu“ podle tématu);
   - lidé (počet, odznak „1 návrh shody“);
   - strom;
   - „Stáhnout GEDCOM“.
3. **`/rodina/kniha` (WP4)**
   - Titulek „Vzpomínky dědy Jaroslava“, úzký serifový sloupec.
   - Za odstavci číslované `CitationChip`y. Klik → popover s `quote` a odkazem `/rodina/povidani/s1#s1-t07`.
   - Žlutý štítek „neověřeno“ + `warnings`.
   - Tužka → inline textarea → PATCH → štítek „upraveno rodinou“.
   - „Schválit kapitolu“, dole „Otázky na příště“.
4. **`/rodina/povidani/[id]` (WP4):** přepis jako chat, řádky s `id={turn.id}` a zvýrazněním `:target`. Nahoře shrnutí a vlákna.
5. **`/rodina/lide` (WP3)**
   - Nahoře `MatchCard`: „Pepa Dvořák z vyprávění (kamarád, Kladno, asi 1948) → ve stromě **Josef Dvořák** (*1948, Kladno), manžel sestry Věry. Shoda 100 %.“
   - Rozpad skóre, brány, `alsoConsidered`, citace.
   - Tlačítka **[Ano, je to on] [Není to on]**.
   - Pod tím tabulky Lidé / Místa / Události (seřazené podle roku).
6. **`/rodina/strom` (WP3)**
   - `FamilyTree`: řádky podle `generation`, karty s barvou podle pohlaví, rokem a místem, SVG spojnice rodič–dítě a manželé (`lib/treeLayout.ts`, pure funkce).
   - Zvýrazněný uzel po potvrzení, boční panel s citacemi.
   - Tlačítko **Stáhnout GEDCOM (MyHeritage / Geni / FamilySearch)**.
7. **`/demo` (WP5)**
   - Stav z `/api/health`.
   - Tlačítka „Načíst: prázdné / po povídání 1 / po povídání 2“.
   - „Finalize poslední session“, „Vygenerovat kapitolu Dětství“.
   - Náhled `MemoryContext` + `dynamicVariables`.
   - Kontrolka „první věta agenta == firstMessage“.
   - Odkazy na všechny stránky.

---

## 12. Harmonogram (reálný čas)

| Čas | Co | Kdo |
|---|---|---|
| **15:00–15:15** | **Lidské úkoly (paralelně s WP0):** <br>1) Supabase projekt a SQL z §2, zkopírovat URL a service role key. <br>2) ElevenLabs: klíč s oprávněním ConvAI+TTS, vybrat **mužský český hlas** (VOICE_ID). <br>3) `.env.local`. <br>4) Smoke curl OpenAI `/v1/models` a Gemini `models`, zapsat skutečná ID modelů. <br>5) Render: New Web Service z GitHubu (zatím prázdné repo, dokončí se v 15:40). | ty |
| **15:00–15:35** | **WP0 Foundation** | 1 subagent |
| 15:35 | Orchestrátor commit + push, Render se připojí na `main` (build `npm ci && npm run build`, start `npm run start`, env proměnné, `STATE_ID=prod`). Vznikne první veřejná URL. | ty |
| **15:35–16:25** | **Vlna 1 paralelně:** WP1 Voice, WP2 AI+paměť, WP3 Genealogie, WP4 Rodinné UI, WP5 Demo obsah | 5 subagentů |
| 15:35–15:50 | WP1 spustí `create-agent.ts` (timebox 10 min, jinak dashboard). **Test 2 min hovoru česky v dashboardu.** | WP1 + ty |
| **16:00** | **Voice GO/NO-GO:** token + `startSession` + 3 výměny česky na localhostu. NO-GO znamená, že primární cestou je textový režim + TTS a WP1 dotáhne ten. | ty |
| **16:25–16:50** | **WP6 Integrace:** odstranit stuby, `tsc`, `vitest`, `next build`, E2E flow na localhostu. **Cíl: e2e zelené v 16:45.** | 1 subagent + ty |
| 16:30 | **Škrtací bod:** když P0 e2e neběží, všechno P1/P2 jde pryč. | ty |
| **16:50–17:10** | Push → Render deploy. `POST /api/demo/load after-s1` na prod. E2E na veřejné URL (HTTPS mikrofon). **Echo test v sále** (headset pro „dědu“, AI z reproduktoru notebooku). | ty + WP7 |
| 17:00–17:25 | WP7 polish + README + `docs/DEMO.md` (paralelně). Zkušební session 2 → finalize → pokud je výsledek dobrý, `save-snapshot after-s2-live`. | subagent + ty |
| **17:25–17:45** | 2× generálka (60 s a 120 s), drill fallbacků (text režim, snapshot), **záložní video** (QuickTime), warm-up Render instance. | ty |
| **17:45–17:55** | Freeze, finální push, check-in formulář (název, GitHub, Render URL). `after-s1` načtený na prod. | ty |
| 18:00 | Code freeze, pitche | |

---

## 13. Work packages pro subagenty

### Společná pravidla (vloží se do každého promptu a do `AGENTS.md`)
- Uprav **jen vlastněné soubory**. Needituj `lib/types.ts`, `lib/schemas.ts`, `lib/store.ts`, `package.json`, `app/layout.tsx`.
  - Potřebuješ-li změnu, zapiš ji do `docs/CONTRACT_REQUESTS.md` a obejdi ji lokálně adaptérem ve své složce.
- Nepřidávej npm balíčky.
- **Nespouštěj `next build` ani `next dev`. Necommituj.**
- Ověřuj přes `npx tsc --noEmit` (chyby v cizích souborech ignoruj a jen je nahlas) a `npx vitest run tests/<tvoje>`.
- Pravidla Next.js z §5: `await params`, `force-dynamic`, `after()`, klíče jen na serveru.
- Kód a identifikátory anglicky, UI texty česky.
- Bez klíčů vyvíjej s `MOCK_AI=1` a `STORE=file`.
- Na konci vypiš: co je hotovo, co je stub, contract requests a příkazy pro ověření.

**Šablona promptu:** „Jsi subagent pro **WPx {název}** v `/Users/majny/Desktop/MyProjects/hackathon-cursor`. Přečti `AGENTS.md`, `docs/PLAN.md` (sekce WPx + §5, §6, §7) a `docs/CONTRACTS.md`. Vlastníš jen: {seznam}. Hotovo = {kritéria}. Nakonec vypiš souhrn podle AGENTS.md.“

### WP0 Foundation (sekvenčně, 15:00–15:35, blokuje vše)
- **Cíl:** kostra, zmrazené kontrakty, fungující store v obou režimech.
- **Soubory:** vše označené [WP0] v §4.
- **Kroky:**
  1. `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm` (repo je prázdné, zachovat `.git`).
  2. Instalace balíčků z §2.
  3. **Context7:** ověřit `@elevenlabs/react` (provider, `onMessage`, `startSession` parametry), `openai` (`chat.completions.parse` + `zodResponseFormat`, kompatibilitu se zod), `@google/genai` (structured JSON config). Snippety zapsat do `docs/CONTRACTS.md`, případně pinovat zod.
  4. `lib/types.ts` (§5), `lib/schemas.ts` (zod: `SessionSummarySchema`, `ExtractionSchema`, `ChapterSchema`; jen `.nullable()`, žádné min/max).
  5. `lib/store.ts` (Supabase + file, mutex, version retry, auto-seed).
  6. `lib/llm.ts` s kostrou (`MOCK_AI` → fixtures funguje, OpenAI/Gemini větve jako TODO pro WP2).
  7. `lib/api-client.ts`, `lib/ids.ts`, `lib/topics.ts`.
  8. **Všechny P0 routes jako stuby** (správné typy, `await params`, `force-dynamic`) nad storem a fixtures.
  9. `components/ui/*`, `app/layout.tsx` + paleta.
  10. `data/snapshots/empty.json` (grandparent + strom se 3 osobami jako placeholder), `data/fixtures/*.json` (smysluplné mock výstupy odpovídající schématům).
  11. `vitest.config.ts` s `vite-tsconfig-paths`.
  12. `.env.example`, `.gitignore` (`.env*.local`, `data/db.json`), `.node-version` (22 nebo LTS podporovaná Renderem), `render.yaml` (web service, `npm ci && npm run build`, `npm run start`), scripts `typecheck`, `test`, `smoke:llm`.
  13. `AGENTS.md`, `docs/CONTRACTS.md`, `docs/PLAN.md` (tento plán).
- **Akceptace:**
  - `npm run typecheck`, `npm test` (`tests/store.test.ts`: 20 paralelních `updateDb` neztratí zápis, `loadSnapshot` funguje, file režim) a `npm run build` projdou.
  - `GET /api/health` a `GET /api/tree` vrací JSON.
  - S reálnými env zapíše store do Supabase řádky `STATE_ID`.

### WP1 Voice & Talk page (paralelně)
- **Cíl:** česká hlasová konverzace, turny se ukládají průběžně, text fallback, konec session spouští finalize.
- **Soubory:** `app/page.tsx`, `components/talk/*`, `lib/elevenlabs.ts`, `app/api/tts/*`, `app/api/el-token/*`, `scripts/create-agent.ts`, `tests/talk.test.ts`.
- **Vstupy:** `POST /api/sessions` (vrací `dynamicVariables` + `conversationToken`, WP2 volá `mintToken()` z `lib/elevenlabs.ts`), `/turns`, `/finalize`, `/api/chat`, `GRANDCHILD_TEMPLATE` z WP2 (do té doby draft z §7.1).
- **Staví:**
  - `mintToken()`: `GET /v1/convai/conversation/token?agent_id=` → `{token}`.
  - `tts(text)`: `@elevenlabs/elevenlabs-js` `textToSpeech.convert/stream`, `eleven_flash_v2_5`, `languageCode:"cs"` (ověřit názvy).
  - **`create-agent.ts`:** `POST /v1/convai/agents/create`: jazyk cs, voice, TTS flash v2.5, LLM Claude Haiku 4.5 (enum ověřit), prompt = šablona, first_message `{{first_message}}`, dynamic variable placeholders s defaulty. Vypíše `AGENT_ID`. **Timebox 10 min**, jinak manuální návod do README a `scripts/print-agent-prompt.ts`.
  - Klientská logika: `useConversation` s `onConnect`/`onMessage`/`onDisconnect`/`onError`, mapování `user` → `grandparent` a `ai`/`agent` → `ai`, `clientSeq` čítač, POST každé zprávy hned (fronta, sériově).
  - Finalize při Skončit **i** `onDisconnect` (guard, aby proběhl jen jednou).
  - Stavy, auto přepnutí do TextFallback, `NextTimeCard`, `MemoryPeek`, `?warm=1`.
- **Akceptace:**
  - `tsc` bez chyb ve vlastních souborech.
  - Unit test fronty turnů (pořadí podle clientSeq, žádné duplicity).
  - `curl -X POST /api/tts -d '{"text":"Ahoj dědo"}'` vrátí `audio/mpeg`.
  - Manuálně (ty v 16:00): Povídat → agent řekne `firstMessage` česky mužským hlasem → 3 výměny → turny v Supabase → Skončit → finalize zavolán.
  - `grep -r ELEVENLABS_API_KEY .next/static` (po buildu ve WP6) nic nenajde.
- **Závislosti:** WP0. Paralelně s WP2–WP5.

### WP2 AI pipeline & paměť (paralelně, kritická cesta)
- **Cíl:** llm abstrakce, prompty, buildMemory, finalize, kapitoly s validací citací, chat.
- **Soubory:** implementace `lib/llm.ts` (kostra je od WP0, WP2 dostává vlastnictví), `lib/prompts/*`, `lib/memory.ts`, `lib/pipeline.ts`, `lib/chapters.ts`, `lib/entities.ts`, `app/api/sessions/**`, `app/api/memory`, `app/api/chat`, `app/api/chapters/**`, `app/api/entities`, `scripts/smoke-llm.ts`, `data/fixtures/*`, `tests/{memory,prompts,citations,entities}.test.ts`.
- **Vstupy:** schémata z `lib/schemas.ts`, `suggestMatches` z WP3 (stub), `mintToken` z WP1 (stub vrací `null`).
- **Staví:**
  - prompty z §7;
  - `renderGrandchildPrompt`, `buildDynamicVariables`;
  - `buildMemory` (§8);
  - `finalizeSession` (idempotentní, `Promise.all`, status `failed` + fallbackSnapshot při chybě);
  - `generateChapter` + `validateCitations` včetně kontroly roků a jmen;
  - `mergeEntities`;
  - OpenAI a Gemini větve `llm.ts`;
  - `/api/chat`;
  - formát přepisu `[s1-t07] DĚDA: …`.
- **Akceptace:**
  - `tests/prompts.test.ts`: placeholdery šablony == `GRANDCHILD_VARIABLES`, `buildDynamicVariables` vrací všechny klíče neprázdné, render nezanechá `{{`.
  - `tests/memory.test.ts`: ze snapshotu `after-s1` (nebo fixture) platí `firstMessage == nextSessionOpener`, `openThreads` obsahuje „pouť“, `isFirstSession=false`. Z `empty` vznikne úvodní šablona.
  - `tests/citations.test.ts`: neexistující ID a AI turn se zahodí, `quote` je doplněný, rok, který nezazněl, dá `verified=false` + warning.
  - `npm run smoke:llm` (reálné klíče) nad seed přepisem: všechna 3 schémata projdou na OpenAI i s `LLM_PROVIDER=gemini`. Pepa je v persons (`birthYear` 1948, `approx=true`, Kladno), existuje vlákno „pouť“, každý odstavec kapitoly má citaci. **Vypsat časy: finalize < 25 s.**
- **Závislosti:** WP0. Měkce WP3 (stub) a WP1 (stub).

### WP3 Genealogie: strom, matching, GEDCOM, stránky lide a strom (paralelně)
- **Cíl:** plný fake strom, deterministický matching s branami, GEDCOM writer, UI lidé a strom.
- **Soubory:** `data/fake-tree.json`, `lib/matching/*`, `lib/gedcom.ts`, `lib/treeLayout.ts`, `app/api/tree`, `app/api/matches/**`, `app/api/export/gedcom`, `app/rodina/lide/*`, `app/rodina/strom/*`, `components/people/*`, `components/tree/*`, `scripts/export-sample-ged.ts`, `tests/{matching,gedcom,treeLayout}.test.ts`.
- **Vstupy:** typy, `suggestMatches` signatura z §6, ručně vytvořené PersonEntity v testech.
- **Akceptace:**
  - `tests/matching.test.ts`: všechna očekávání z §9 (I6 ≥ 0.95 strong, I12 a I13 ≤ 0.5 a nenavrženy, Honza→Jan, Nováková~Novák, Jožka+F→Josefa, rozdílné pohlaví, JW martha).
  - `tests/gedcom.test.ts`: všechna kritéria z §10 včetně round-tripu přes read-gedcom (16 INDI / 8 FAM).
  - `tests/treeLayout.test.ts`: žádné překryvy karet v generaci.
  - `scripts/export-sample-ged.ts` vytvoří `.ged`.
- **Závislosti:** jen WP0. Plně nezávislý.

### WP4 Rodinné čtecí UI (paralelně)
- **Cíl:** přehled, kniha s citacemi a editací, přepis s kotvami.
- **Soubory:** `app/rodina/layout.tsx`, `app/rodina/page.tsx`, `app/rodina/kniha/*`, `app/rodina/povidani/**`, `components/book/*`, `tests/book.test.ts`.
- **Vstupy:** `lib/api-client.ts`, `data/fixtures/chapter.json`, snapshot `after-s2` (až ho WP5 dodá).
- **Akceptace:**
  - `tsc` bez chyb.
  - Pure test číslování citací a mapování na odkazy.
  - Stránky mají `force-dynamic`.
  - Manuálně ve WP6: klik na citaci ukáže quote a odkaz skočí na zvýrazněný řádek, `verified=false` je vidět, oprava přežije reload.
  - Čitelnost na projektoru při 1280 px.
- **Závislosti:** jen WP0.

### WP5 Demo obsah, snapshoty a /demo (paralelně)
- **Cíl:** realistická česká data pro záchranné demo a ovládací panel.
- **Soubory:** `data/snapshots/after-s1.json`, `data/snapshots/after-s2.json`, `app/demo/page.tsx`, `app/api/demo/load/*`, `scripts/save-snapshot.ts`, `docs/DEMO.md`, `tests/snapshots.test.ts`.
- **Obsah:**
  - **after-s1:** session 1 „Dětství na Kladně“, ~20 replik:
    - komíny Poldovky;
    - maminka Anna a buchty;
    - táta František v huti;
    - sestra Věrka;
    - fotbal na plácku s **Pepou Dvořákem, o dům vedle, o dva roky mladší**;
    - začátek příběhu: „jak jsme s Pepou v padesátým osmým utekli na pouť do Prahy… no, to ti řeknu příště“.

    K tomu summary s `nextSessionOpener` „Ahoj dědo! Minule jsi mi začal vyprávět, jak jste s Pepou v padesátém osmém utekli na pouť do Prahy – tak jak to doma dopadlo?“, open thread, persons (Pepa, Anna, František, Věra), places, events, match Pepa → I6 `suggested`.
  - **after-s2:**
    - session 2 dovyprávění (tramvají, pak pěšky, bez peněz, návrat v noci, táta a řemen, Pepa dostal zaracha, „Pepa si pak vzal naši Věrku“) a přechod k vojně v Jihlavě 1965;
    - vlákno pouť `resolved`, nové vlákno vojna;
    - kapitola „Kluk od komínů Poldovky“ se 4–5 odstavci, všechny citace platné;
    - match `suggested` (potvrzení se dělá živě).
  - `/demo` podle §11.
  - `docs/DEMO.md`: scénář §14, repliky „dědy“ pro session 2, EN pitch 60 s a 120 s.
- **Akceptace:** `tests/snapshots.test.ts` ověří, že:
  - snapshoty validují proti typům (zod);
  - všechna turnIds v kapitolách, entitách a vláknech existují a citace jsou jen repliky dědy;
  - `buildMemory(after-s1).firstMessage` obsahuje „pouť“ (až bude WP2);
  - `suggestMatches` nad `after-s1` dá I6 (až bude WP3).

  `/api/demo/load` přepne stav.
- **Závislosti:** WP0.

### WP6 Integrace + E2E (sekvenčně, 16:25–16:50)
- Zapracovat `CONTRACT_REQUESTS.md`, nahradit stuby, spustit `npm run typecheck && npm test && npm run build`.
- **E2E (reálné klíče, `STORE=supabase`, `STATE_ID=local`):**
  1. load `after-s1`;
  2. `/` Povídat → agent řekne opener o pouti;
  3. 3 výměny;
  4. Skončit → finalize < 30 s → „Příště se zeptám na…“;
  5. `/rodina/kniha` → generovat nebo zobrazit kapitolu → citace fungují;
  6. `/rodina/lide` → potvrdit Pepu;
  7. `/rodina/strom` → zvýrazněno → stáhnout GEDCOM;
  8. textový fallback funguje;
  9. `/demo` → after-s2 < 1 s;
  10. kontrola klíče v `.next/static`.
- Opravy jako cílené bugfixy (1 bug = 1 přesné repro).
- Orchestrátor commituje po zelené.

### WP7 Deploy, polish, README (16:50–17:25, částečně paralelně)
- Render env (`STATE_ID=prod`), deploy, load `after-s1` na prod, E2E na veřejné URL.
- README:
  - problém a řešení;
  - screenshot;
  - architektura (diagram z §3);
  - jak spustit;
  - GDPR (souhlas prarodiče, data v EU regionu Supabase, RLS, export a smazání, třetí osoby jen s lidským potvrzením);
  - „Built with Cursor + Claude Code; Claude as the conversational brain via ElevenLabs“.
- Titulky stránek, favicon, doladění `/` a knihy.

**Paralelismus:** WP0 → {WP1, WP2, WP3, WP4, WP5} → WP6 → WP7.
- Kritická cesta: WP0 → WP2 → WP6.
- Stuby od WP0 odstraní vnitřní závislosti vlny 1.

---

## 14. Demo scénář

### Příprava
- Na prod je načtený `after-s1`, Render instance je zahřátá (otevřít URL 2 min předem).
- Záložky: `/`, `/rodina/kniha`, `/rodina/lide`, `/rodina/strom`, `/demo`.
- Headset nebo mikrofon u pusy „dědy“, AI hraje z reproduktoru notebooku, echo cancellation zapnuté.
- Hotspot z telefonu připravený.

### 3 minuty (plná verze podle briefu)
1. **(20 s) Problém, EN:** „Our grandparents' stories disappear with them. Nobody has time to record and write them down. Meet an AI grandchild that talks to grandpa in Czech, remembers every conversation, and turns it into a family biography linked to the family tree.“
2. **(25 s) Session 1 (seed):** na `/demo` nebo `/rodina/povidani/s1` ukázat, že včera děda vyprávěl o dětství na Kladně a o Pepovi a nedořekl příběh s poutí.
3. **(50 s) Session 2 živě:** Povídat.
   - AI: „Ahoj dědo! Minule jsi mi začal vyprávět, jak jste s Pepou utekli na pouť do Prahy – tak jak to doma dopadlo?“ Na plátně jsou titulky + EN řádek.
   - „Děda“ dovypráví 2–3 věty (1958, táta a řemen, „Pepa si pak vzal naši Věrku“). AI se doptá na jeden detail.
   - Skončit → „Příště se zeptám na: vojna v Jihlavě“.
4. **(40 s) Kniha:**
   - kapitola „Kluk od komínů Poldovky“;
   - klik na citaci ukáže doslovnou větu dědy;
   - štítek „neověřeno“ jako ochrana proti halucinacím;
   - rodina opraví jedno slovo.
5. **(35 s) Lidé a strom:**
   - Pepa z vyprávění → Josef Dvořák *1948 Kladno, manžel dědovy sestry, 100 %;
   - návnady (strýc Josef Novák 1924, bratranec Josef Horák) jsou vyřazené podle roku a příjmení;
   - **člověk potvrdí**, uzel se rozsvítí;
   - Stáhnout GEDCOM → MyHeritage/Geni.
6. **(10 s) Závěr:** „Claude as the curious grandchild via ElevenLabs Czech voice, memory across sessions, cited chapters, standard GEDCOM. Built this afternoon, live on Render.“

### 120 s (finále)
Body 1 (10 s), 3 (40 s, jen 1 odpověď dědy), 4 (25 s), 5 (25 s), 6 (10 s). Zbytek jsou otázky. Finalize neřešit, kapitolu ukázat ze snapshotu (po živé session nechat `after-s1` data a v knize ukázat připravenou kapitolu: načíst `after-s2` na pozadí z `/demo` v druhé záložce).

### 60 s (skupinové kolo)
- Session je **pre-warmed** (`/?warm=1`, AI už řekla úvodní větu o pouti).
- (10 s) problém → (20 s) „AI remembers last conversation“ + jedna odpověď dědy → (15 s) citace v knize → (15 s) potvrzení Pepy + GEDCOM.
- Když se hlas zasekne, rovnou kniha a strom.

---

## 15. Fallback matice

| Selhání | Detekce | Akce (≤ 5 s) |
|---|---|---|
| ElevenLabs token / WebRTC / kredit | `onError`, žádný zvuk do 8 s | Auto přepnutí na TextFallback (OpenAI chat + `/api/tts`). Jinak jen text. |
| Agent nemá paměť (proměnné neprošly) | `/demo` kontrolka firstMessage je červená | Restart session. Pokud přetrvá, textový režim (paměť tam dosazujeme sami). |
| Agent se přerušuje (echo) | AI mluví do sebe | Headset pro dědu, ztlumit reproduktor, v agentovi snížit interruption sensitivity (nastavit předem). |
| Špatná česká STT (hluk) | nesmyslné titulky | Mluvit blíž k mikrofonu, krátké věty. Jinak text. |
| Pomalá odpověď agenta | > 2,5 s | V dashboardu přepnout LLM (Haiku ↔ Sonnet 5), rozhodnout na generálce. |
| OpenAI selže nebo je pomalé | chyba / > 25 s | `llm.ts` automaticky přepne na Gemini. Pak `/demo` → after-s2. |
| Finalize > 40 s | timeout | Tlačítko „Načíst připravený výsledek“ (after-s2). |
| Kapitola halucinuje | generálka | Ukázat kontrolovanou kapitolu ze snapshotu. |
| Supabase nedostupné | `/api/health` | Lokálně `STORE=file` + `npm run start` na notebooku (`localhost` = secure context pro mikrofon). |
| Render spí nebo padá (cold start) | pomalé první načtení | Warm-up 2 min předem. Záloha localhost. |
| Wi-Fi | – | Hotspot. Když ani ten nejde, video + lokální `STORE=file` (`/rodina/*` a export bez sítě). |
| Notebook / prohlížeč | – | Záložní video. Repo + `.env.local` na druhém stroji, pokud je. |

---

## 16. Rizika a odpovědi porotě
- **Halucinace:** povinné citace, validace kódem (existence, role, roky a jména), „neověřeno“, schválení rodinou.
- **Chybné párování:** deterministické skóre s branami, návnady v demu, vždy lidské potvrzení.
- **GDPR:** souhlas prarodiče, Supabase v EU regionu s RLS, service key jen na serveru, export a smazání na žádost, třetí osoby se nepublikují, shodu potvrzuje člověk.
- **MyHeritage nemá write API:** standardní GEDCOM 5.5.1 a ruční import.
- **STT u seniorů:** Scribe v2 (≤ 5 % WER v češtině), „patient“ turn-taking, textový režim pro rodinu.
- **Téma „dev tools“:** stejná pipeline je znovupoužitelný „voice agent + long-term memory + cited structured extraction“ stack.

---

## 17. Definition of Done
- [ ] `npm run build`, `npx vitest run` zelené. Render URL žije.
- [ ] `/` → Povídat → AI česky první větou naváže na pouť z session 1.
- [ ] AI odpovídá ≤ 2,5 s jednou otázkou, bez seznamů.
- [ ] Turny se ukládají průběžně (refresh nic neztratí).
- [ ] Finalize ≤ 30 s: nové summary, vlákno pouť `resolved`, karta „Příště…“.
- [ ] Kapitola ≥ 3 odstavce s platnými citacemi, popover s quote, odkaz do přepisu.
- [ ] `/rodina/lide`: Pepa (asi 1948, Kladno) → I6 strong, návnady nenavrženy.
- [ ] Potvrzení → uzel ve stromě zvýrazněný. GEDCOM se stáhne, obsahuje `NICK Pepa` a NOTE u I6, testy prošly.
- [ ] Textový fallback funguje bez ElevenLabs.
- [ ] `/demo` → after-s2 < 1 s.
- [ ] README, push, check-in formulář vyplněný, záložní video nahrané.


## Klíčová rozhodnutí
- Základem je plán demo-first, jediný navázaný na reálný čas. Časy jsou přepočítané na 15:00 až 18:00: WP0 15:00-15:35, vlna 1 15:35-16:25, voice GO/NO-GO v 16:00, integrace do 16:50 (e2e cíl 16:45), deploy 16:50-17:10, generálka a video 17:25-17:45, check-in 17:50.
- Anthropic klíč nemáme. Claude zůstává mozkem hovoru jako vestavěné LLM v ElevenLabs agentovi (Claude Haiku 4.5, případně Sonnet 5), účtuje to ElevenLabs. Shrnutí, extrakci, kapitoly a textový chat dělá OpenAI (chat.completions.parse + zodResponseFormat). Gemini je automatický fallback za jednou abstrakcí lib/llm.ts. Modely se berou z env OPENAI_MODEL, OPENAI_MODEL_WRITER a GEMINI_MODEL, defaulty je nutné ověřit.
- Paměť jde do agenta přes dynamicVariables a first message je {{first_message}}, tedy deterministický opener ze shrnutí minulé session. Overrides se nepoužívají. Vždy se posílají všechny proměnné, test hlídá shodu placeholderů. /demo kontroluje, že první věta agenta odpovídá firstMessage.
- Úložiště je Supabase Postgres jako jedna JSONB řádka na prostředí (app_state[STATE_ID]) s optimistickou verzí a in-process mutexem. Lokálně jde přepnout na STORE=file. Snapshoty jsou JSON v repu a načtou se jedním klikem. Deploy je Render Web Service s auto-deploy z main. HTTPS zajistí, že mikrofon funguje i na veřejné URL.
- Opravené matchování: JW příjmení pod 0.85 se počítá jako 0. Když se známá příjmení neshodují, je skóre omezeno na 0.5. Když se roky liší o víc než 10, je skóre omezeno na 0.5. Bez příjmení je strop 0.9. Děda a vnuk jsou vyřazeni. Navrhuje se jen top-1. Očekávané hodnoty jsou přepočítané ručně: I6 = 1.0, návnady I12 a I13 ≤ 0.5.
- Persona: děda Jaroslav Novák (*1946, Kladno). AI hraje vnuka Tomáše mužským hlasem a tyká mu. Pepa = Josef Dvořák (*1948, Kladno), manžel dědovy sestry Věry. Strom má 16 osob a 8 explicitních rodin.
- Proti halucinacím: citace validuje kód (existence repliky, citovat jde jen repliky dědy). Server doplní citát a kontroluje, že roky a vlastní jména z odstavce zazněly v citovaných replikách. Když ne, odstavec dostane štítek 'neověřeno' s varováním.
- Strom kreslí vlastní CSS/SVG layout (family-chart nepoužíváme). Pro GEDCOM 5.5.1 máme vlastní writer a round-trip test přes read-gedcom.
- Pravidla pro subagenty: pracují ve sdíleném stromu, ale každý jen ve svých souborech. Nespouštějí next build ani dev a necommitují, commituje orchestrátor. Mají MOCK_AI a STORE=file pro práci bez klíčů. Pravidla Next.js: await params, force-dynamic, after(). Vitest s vite-tsconfig-paths.
- Demo: session 1 je naseedovaná, živě běží jen session 2. V 60s kole je session připojená předem (pre-warm). Pitch je v angličtině, audio česky s titulky a anglickým řádkem. Finalize se při pitchi nečeká, kapitola je ze snapshotu.

## Otevřené otázky
- Má tvůj ElevenLabs klíč oprávnění pro Conversational AI (Agents) i TTS? A nabízí tvůj plán v dropdownu agenta vestavěný Claude (Haiku 4.5 / Sonnet 5)? Pokud ne, fallback je Gemini nebo GPT jako LLM agenta.
- Které OpenAI modely máš k dispozici? Stačí výstup z GET /v1/models. Default gpt-5-mini / gpt-5 je jen předpoklad. Stejně tak u Gemini, default je gemini-2.5-flash.
- Render: free instance po nečinnosti usíná, cold start trvá asi 50 s. Můžeš si na dnešek pustit placenou Starter instanci, nebo budeme URL před pitchem ručně zahřívat?
- Supabase: založíš projekt v EU regionu a pošleš SUPABASE_URL a service role key? Chceš data oddělit podle STATE_ID (local/prod), jak navrhuji?
- Jsi na hackathonu opravdu sám? Kdo bude v demu hrát dědu, a máš headset nebo externí mikrofon kvůli hluku a echu?
- Souhlasíš s vymyšlenou personou (děda Jaroslav Novák *1946 Kladno, vnuk Tomáš tyká, Pepa = Josef Dvořák *1948)? Nebo chceš jiné jméno či babičku?
- Smí orchestrátor commitovat a pushovat přímo na main do Majny/hackathon-cursor? Render se napojí na auto-deploy z main.
- Pitch v angličtině a hlas v češtině s anglickým řádkem v titulcích (P1), souhlasíš?
- Ověříš na kickoffu nebo u organizátorů, že téma 'Forge the Stack' není povinné? Jinak přidáme do pitche větu o znovupoužitelném voice+memory stacku.
