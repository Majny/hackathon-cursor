# Heirloom – demo script

*Your family's stories, in their own voice.*

## Prep (T−10 min)
- Load **after-s1** on prod: `/demo` → "Load: after session 1" (or `curl -X POST <url>/api/demo/load -H 'Content-Type: application/json' -d '{"snapshot":"after-s1"}'`).
- `/demo`: all "Status" badges green; "What the AI remembers" shows the next opening line:
  > Hi Grandpa! Last time you started telling me how you and Pepa ran off to the fair in Prague in fifty-eight — so how did it go when you got home?
- Warm up Render (open the URL 2 min before).
- Tabs: `/`, `/talk`, `/family/book`, `/family/people`, `/family/tree`, `/demo`.
- Headset/mic for "Grandpa", AI through the laptop speaker, echo cancellation on. Hotspot ready.
- The ElevenLabs agent must be on the English prompt: `npx tsx --env-file=.env.local --env-file=.env.production.local scripts/update-agent.ts` (prints `UPDATE OK`).
- After the live session check the **"agent's first line == firstMessage"** light on `/demo` (green = memory made it through).

## What is in the snapshots
| snapshot | content |
|---|---|
| `empty` | just Grandpa Jaroslav + the imported family tree |
| `after-s1` | Session 1 "Childhood in Kladno" (20 turns): the Poldi steelworks chimneys, mum Anna and her Saturday buns, dad František the steelworker, little sister Věrka, football with Pepa Dvořák ("lived in the house next door, two years younger"), and the unfinished story of running off to the fair in Prague in 1958 ("…well, I'll tell you next time"). Open thread `th-pout`, persons Pepa/Anna/František/Věrka, match Pepa → **I6 Josef Dvořák** (`suggested`, 100 %, decoys I13 and I12 in `alsoConsidered`). Full tree from `data/fake-tree.json`. |
| `after-s2` | + Session 2 (16 turns): the rest of the fair story (tram without tickets, walking, no money, home in the middle of the night, Dad with his belt, Pepa grounded, "Pepa later married our Věrka") and the move to military service in Jihlava in 1965. `th-pout` resolved in s2, new thread `th-vojna`. Chapter **"The Boy from the Poldi Chimneys"** (5 paragraphs, every citation is one of Grandpa's turns, all years and names verified). Match still `suggested` (confirmed live). |

Save the live state as a backup: `STORE=file npx tsx scripts/save-snapshot.ts after-s2-live` (for Supabase run with the env vars; `/api/demo/load` also accepts `after-s2-live`).

## Grandpa's lines for live session 2 (short sentences, close to the mic)
The AI starts: *"Hi Grandpa! Last time you started telling me how you and Pepa ran off to the fair in Prague in fifty-eight — so how did it go when you got home?"*

1. "Ah yes, the fair. That was in 1958, in the summer. I was twelve and Pepa was ten."
2. "Part of the way we rode the tram, without a ticket, and then we walked. We had no money at all, not a single crown."
3. "We got home in the middle of the night. My dad stood in the doorway with his belt. And Pepa was grounded for the whole summer holidays."
4. "And you know the best part? Pepa later married our Věrka. So my friend became my brother-in-law."
5. (if there is time) "Then I finished my apprenticeship and in 1965 they called me up for military service. To Jihlava."
6. End: "All right, Tom, I'll tell you about the army next time." → **End** button → "Next time I'll ask about: military service in Jihlava".

For 120 s / 60 s, lines 1+3+4 merged into one answer are enough: *"That was in fifty-eight. We took the tram and then walked, with no money. My dad was waiting for me with his belt. And Pepa later married our Věrka."*

## 3 minutes (full version)
1. **(20 s) Problem** – see the pitch below.
2. **(25 s) Session 1:** `/family/sessions/s1` – yesterday Grandpa talked about his childhood in Kladno, about Pepa, and stopped in the middle of the fair story (last turns).
3. **(50 s) Session 2 live:** `/talk` → Talk. The AI says the opener about the fair (with captions). Grandpa says lines 1–4, the AI asks follow-ups. End → "Next time I'll ask about: military service in Jihlava".
4. **(40 s) The book** `/family/book`: chapter "The Boy from the Poldi Chimneys" → click a citation to see Grandpa's exact sentence → the "unverified" label as the guard against hallucinations → the family fixes one word (pencil).
   - If finalize/chapter isn't ready in time: `/demo` → "Load: after session 2" (< 1 s) and show the prepared chapter.
5. **(35 s) People and tree** `/family/people`: Pepa from the stories → Josef Dvořák, born 1948 in Kladno, husband of Grandpa's sister Věra, 100 %; the decoys (uncle Josef Novák 1924, cousin Josef Horák 1946 from Rakovník) ruled out by year and surname → **[Yes, that's him]** → `/family/tree` the node lights up → Download GEDCOM.
6. **(10 s) Close** – see the pitch.

## 120 s (final)
Steps 1 (10 s), 3 (40 s, one merged answer from Grandpa), 4 (25 s), 5 (25 s), 6 (10 s). Don't wait for finalize: in a second tab load `after-s2` on `/demo` and show the prepared chapter.

## 60 s (group round)
The session is pre-warmed (`/talk?warm=1`, the AI has already said its opener about the fair). (10 s) problem → (20 s) "the AI remembers the last conversation" + one answer from Grandpa → (15 s) citations in the book → (15 s) confirm Pepa + GEDCOM. If the voice stalls, go straight to the book and the tree.

---

## Pitch – 60 s
> Our grandparents' stories disappear with them, and nobody has the time to record them and write them down.
> Meet Heirloom – an AI grandson. Tom calls Grandpa Jaroslav with a real voice and just listens.
> *(Grandpa's screen)* Yesterday Grandpa started a story about running off to the fair in Prague in 1958, and didn't finish it. Today the AI remembered – its very first sentence picks up exactly where he stopped.
> *(Grandpa answers)*
> Every conversation becomes a family book. Each paragraph is cited to Grandpa's own words – click it and you see what he actually said; anything we can't verify is flagged, so no hallucinated family history.
> And the people he mentions are matched to the family tree: "Pepa from next door" is Josef Dvořák, born 1948 – Grandpa's brother-in-law. A human confirms, and it exports as standard GEDCOM to MyHeritage or FamilySearch.
> Memory across sessions, cited chapters, a real family tree. Heirloom – your family's stories, in their own voice.

## Pitch – 120 s
> **Problem.** When our grandparents go, their stories go with them. Families mean to record them, but nobody has the time, and a phone recording nobody transcribes is not a family history.
>
> **Solution.** Heirloom is an AI grandson. Grandpa Jaroslav, born 1946 in Kladno, a Czech steel town, presses one big button and talks – by voice, to Tom, a curious grandson powered by Claude through ElevenLabs.
>
> **Memory.** Yesterday he told us about the steelworks chimneys, his mum's Saturday buns and his friend Pepa – and he stopped in the middle of a story: running off to the fair in Prague in 1958. Watch the first sentence today. *(AI: "Hi Grandpa! Last time you started telling me how you and Pepa ran off to the fair in Prague in fifty-eight — so how did it go when you got home?")* That's not scripted – it's the summary of the last session injected into the agent. *(Grandpa answers: the tram, walking, no money, Dad waiting with his belt, and "Pepa later married our Věrka".)*
>
> **The book.** After the call, the conversation becomes a chapter – "The Boy from the Poldi Chimneys". Every paragraph carries citations to Grandpa's exact words. Click one and you see the original sentence. Any year or name that isn't in the cited words gets an "unverified" flag. The family can edit and approve.
>
> **The tree.** People from the stories are matched against the family tree. "Pepa Dvořák, next door, two years younger" becomes Josef Dvořák, born 1948 in Kladno – with the score breakdown, and the decoys it rejected: an uncle Josef born 1924, a cousin Josef Horák from Rakovník. A human always confirms. Then one click exports standard GEDCOM for MyHeritage, Geni or FamilySearch.
>
> **Close.** Claude as the curious grandson, a real voice via ElevenLabs, memory across sessions, cited chapters and a real family tree. Built with Cursor and Claude Code this afternoon. Heirloom – your family's stories, in their own voice.
