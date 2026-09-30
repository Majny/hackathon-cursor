# And Then

Hackathon demo for **Cursor Hackathon Prague: Forge the Stack**.

Grandparents talk (or type). The AI asks follow-ups like a curious grandchild, remembers prior sessions, writes a biography chapter, extracts people/places/years, and proposes family-tree matches (demo: **Pepa from Kladno, 1948**).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional keys (see `.env.example`):

- `OPENAI_API_KEY` — GPT chat + optional realtime voice status
- `XAI_API_KEY` — Grok chat (preferred if present)

Without keys, the **text** path still runs end-to-end with heuristics. Voice is only offered when a real key is configured; it never pretends to succeed.

## Demo flow (1-minute pitch)

1. Tell a short childhood story in English (mention Pepa from Kladno, 1948).
2. Get a follow-up question; end the session (summary saved).
3. Start **session 2** — memory continues from open threads.
4. Generate chapter → see extracted entities → confirm Pepa match on the fake tree.
5. Optional: open `/biography` and download GEDCOM.

## Docs

- [PRODUCT.md](./PRODUCT.md) — product brief (English)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — architecture

## Judging map

| Criterion | How this slice shows it |
| --- | --- |
| **Execution ×2** | Working flow in the browser without inventing API keys |
| **Usefulness** | Real problem: stories die with grandparents; gift for adult children |
| **Clarity** | One page, one path, English copy, honest voice status |

Check-in: `https://spacexai-checkin.vercel.app/project`

## License

MIT — hackathon build.
