# Architecture

## Overview

Two layers:

1. **Live conversation (top).** English talk UI. User speaks or types; the AI answers with a follow-up like a curious grandchild. Transcripts are saved per session.
2. **From transcripts (bottom).** Two outputs from the same session data:
   - a **readable biography chapter**
   - **structured entities** (people, places, dates, events) for a family tree

```
[ Talk / hold-to-talk ] --> transcript + session summary
                |                    |
                v                    v
         biography chapter    people / places / years
                |                    |
                v                    v
         family reading page   match vs fake tree → human confirm → GEDCOM
```

## Stack (hackathon)

| Piece | Choice | Notes |
| --- | --- | --- |
| Frontend | Next.js (App Router) | English UI. One clear flow: talk → follow-up → save session → chapter → entities → Pepa match. |
| Voice | Realtime API when a key exists | OpenAI Realtime or similar. **Do not fake success.** If no key, the Talk button explains that voice is unavailable and text chat stays the working path. |
| Conversation + chapters | LLM with “curious grandchild” system prompt | Prefer **Grok** (`XAI_API_KEY`) or **GPT** (`OPENAI_API_KEY`). If neither key is set, a deterministic heuristic path still runs the full demo (follow-ups, chapter from transcript, extraction). |
| Memory | Session summaries + open threads | JSON file store under `data/store.json` so the demo works without Supabase. Swap to Supabase later if easy. |
| Extraction | One structured step | `people[]`, `places[]`, `events[]` with years, from the transcript. |
| Tree | Fake tree + GEDCOM export | Demo person: **Pepa / Josef Novák, Kladno, born 1948**. Matching is real code (name + place + year scoring). A human confirms before accepting a link. |

## Data model (minimal)

- **Person** — the grandparent being interviewed (demo: one default person).
- **Session** — messages[], summary, openThreads[], createdAt.
- **Chapter** — title, body (grounded in transcript), sourceSessionIds.
- **Entity** — kind (person \| place \| event), name, place?, year?, notes.
- **MatchProposal** — entityId, treePersonId, score, status (proposed \| confirmed \| rejected).

## Matching rules (honest demo)

Score a candidate on:

- name similarity (includes nicknames: Pepa ↔ Josef / Joseph)
- same place (e.g. Kladno)
- same birth year (e.g. 1948)

Only propose a link when score clears a threshold. Never hardcode “Pepa matched.” Confirming is a user action.

## Environment

See `.env.example`. No secrets are committed. The app must start and demonstrate the full text path with zero API keys.
