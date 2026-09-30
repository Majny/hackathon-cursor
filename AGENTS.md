# AGENTS.md – pravidla pro subagenty

Projekt: AI životopisec pro prarodiče (Next.js 16 App Router, TS, Tailwind v4 CSS-first).
Plán: `docs/PLAN.md` (§4 vlastnictví souborů, §5 typy + pravidla, §6 API kontrakty, §13 work packages).
Ověřené API knihoven a stav stubů: `docs/CONTRACTS.md`.

## Společná pravidla
- Uprav **jen vlastněné soubory** (viz PLAN §4 a §13 tvého WP).
- **Needituj** `lib/types.ts`, `lib/schemas.ts`, `lib/store.ts`, `package.json`, `app/layout.tsx`.
  - Potřebuješ-li změnu, zapiš ji do `docs/CONTRACT_REQUESTS.md` (jen přidávat) a obejdi ji lokálně adaptérem ve své složce.
- Nepřidávej npm balíčky.
- **Nespouštěj `next build` ani `next dev` (ani `npm run build/dev/start`). Necommituj, nesahej na git.**
- Ověřuj přes `npx tsc --noEmit` (chyby v cizích souborech ignoruj, jen je nahlas) a `npx vitest run tests/<tvoje>`.
- Kód a identifikátory anglicky, UI texty česky.
- Bez klíčů vyvíjej s `MOCK_AI=1` a `STORE=file` (např. `STORE=file MOCK_AI=1 npx vitest run tests/x.test.ts`).
  `.env.local` nečti a nevytvářej.
- Na konci vypiš: co je hotovo, co je stub, contract requests a příkazy pro ověření.

## Pravidla Next.js (PLAN §5)
- `params` v pages i route handlerech je `Promise`:
  `export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; }`
- **Každá stránka a GET route, která čte store, má `export const dynamic = "force-dynamic"`**, jinak se prerenderuje při buildu se starými daty.
- Práce na pozadí po odpovědi: `after()` z `next/server`.
- Klíče jen v server kódu, nikdy s prefixem `NEXT_PUBLIC_`. `lib/store.ts`, `lib/llm.ts`, `lib/elevenlabs.ts` se nesmí importovat z client komponent.
- Client komponenty (`"use client"`) volají server jen přes `lib/api-client.ts`.
- `@elevenlabs/react` 1.16: `useConversation` musí být uvnitř `<ConversationProvider>` (viz CONTRACTS.md).

## Užitečné
- Store: `getDb()`, `updateDb(db => { mutate; return x })` (fn může běžet víckrát – žádné side-effecty uvnitř), `loadSnapshot(name)`.
- LLM: `llmStructured({ task, schema, system, user, writer? })`, `llmText({ system, messages, maxTokens? })`. `MOCK_AI=1` → `data/fixtures/*.json`.
- ID turnů: `lib/ids.ts` `turnId(sessionId, idx)` → `"s1-t07"`.
- Témata: `lib/topics.ts` `LIFE_TOPICS`.
- UI: `components/ui/{Button,Card,Badge}.tsx`, barvy Tailwind `bg-paper`, `bg-card`, `text-ink`, `text-ink-soft`, `bg-brick`, `border-line`, `bg-warn-soft`, `text-moss`, font `font-serif`.
- Skripty: `npm run typecheck`, `npm test`, `npm run smoke:llm`.
