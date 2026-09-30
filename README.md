# Heirloom

**Your family's stories, in their own voice.**

Grandparents have decades of stories that usually disappear with them. Writing a memoir is hard, and the "Grandpa, tell me…" books end up in a drawer. Heirloom turns ordinary conversations into a family archive.

**Live demo:** https://hackathon-cursor-tnnk.onrender.com
**Family archive:** https://hackathon-cursor-tnnk.onrender.com/family

## How it works

1. **Talk.** Tom, an AI grandson, calls Grandpa and asks about his life: one gentle question at a time, following up on names, places and years. Grandpa just talks. No app, no typing.
2. **Remember.** After every call Heirloom writes a summary and notes the stories he didn't finish. The next call picks up exactly there: *"Last time you started telling me how you and Pepa ran off to the fair in Prague — so how did it go when you got home?"*
3. **Write.** Calls become readable chapters in Grandpa's own voice. Every paragraph links to the exact sentence he said, and paragraphs that can't be backed by his words are flagged. The family reads, corrects and approves.
4. **Connect.** People, places and events are extracted from the calls. People are matched to the family tree (e.g. "Pepa from next door, two years younger" → *Josef Dvořák, born 1948*), a family member confirms the match, and everything exports as standard **GEDCOM** for MyHeritage, Geni or FamilySearch.

## What the family sees

- **Home.** What needs your answer (e.g. "Is Pepa the same person as Josef Dvořák?"), the newest story, and what Tom will ask next time.
- **Stories.** The book, with every line traceable to the call it came from.
- **People and Places.** Everyone Grandpa mentioned, with his exact quotes.
- **Calls.** Full transcripts.
- **Timeline and Family tree.** His life by decade, and the tree with people from his stories highlighted.
- **Search.** Press ⌘K to search everything. It ignores accents, so "verka" finds Věrka.

## Tech

| Part | Choice |
|---|---|
| Voice conversation | ElevenLabs Agents (speech-to-text, TTS, turn-taking), with Claude as the conversational model |
| Memory | Deterministic summaries and open story threads, injected into each new call as dynamic variables |
| Summaries, extraction, chapters | OpenAI structured outputs (Gemini as fallback) |
| Anti-hallucination | Server-side citation check: every chapter paragraph must cite Grandpa's turns, and years and names must appear in them |
| Person matching | Czech diminutives (Pepa → Josef, Honza → Jan), surname normalisation (Nováková ~ Novák), Jaro-Winkler, birth-year tolerance, hard gates; a human always confirms |
| Data | Supabase (Postgres) |
| App | Next.js, Tailwind, deployed on Render |
| Phone channel | Twilio number + ElevenLabs webhooks (built; see `docs/PHONE.md`). WhatsApp calling is the target channel. |

## Run locally

```bash
npm install
cp .env.example .env.local   # add keys: ElevenLabs, OpenAI, Supabase
npm run dev
```

Without keys: `STORE=file MOCK_AI=1 npm run dev` runs the whole flow on local fixtures.
Open `/demo` to load the demo states (`after-s1` = after the first call, `after-s2` = after the second call, with a finished chapter).

```bash
npm test          # unit tests (memory, citations, matching, GEDCOM, snapshots…)
npm run typecheck
```

## Privacy

Grandpa consents to the calls. Data is stored in an EU Supabase region with row-level security, and keys live only on the server. People mentioned in stories are never linked to the tree without a family member confirming it. The archive can be exported or deleted at any time.

---

Built in one afternoon at **Cursor Hackathon Prague: Forge the Stack** (30 Sep 2026).
