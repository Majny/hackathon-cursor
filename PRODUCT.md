# And Then

Product name: **And Then**. It is the question prompt books never ask: “and what happened next?” A grandparent talks, the product keeps asking, and the answers become a life that can sit on a family tree.

The original Czech brief called this *AI životopisec pro prarodiče* (“AI biographer for grandparents”). That name does not survive a one-minute English pitch. Source: Jakub Dvořák’s hackathon brief (30 Sep 2026). PDFs `(1)` and `(3)` in Downloads match this same brief — no second product copy is kept in the repo; `docs/brief.pdf` is the archived source. Unrelated pasted notes (CreatorHub, wedding jokes, Cloudflare) are not product requirements.

**Hackathon language:** English. Conversation UI, pitch, and demo copy are English, even though the original brief described Czech voice for Czech seniors.

## One line

A grandparent talks to an AI the way they would talk to a patient grandchild. The AI writes their life story and turns the people, places, and dates in it into something a family tree can use.

## Problem

Older people have stories they want to pass on. Most of those stories disappear with them.

Prompt books like *Tell Me Your Story, Grandpa* exist, and they have three limits:

- Writing is hard. Many seniors do not like to write, cannot see well, or their hand hurts.
- A blank page blocks them. The questions are generic, and nobody asks “and what happened next?”
- The result sits in a drawer. It cannot be searched, and it is not connected to the family history.

Everyone can talk. Not everyone can write.

## Solution

A voice (or text) AI that interviews the grandparent like a curious grandchild and, across conversations, assembles a biography.

- Talk instead of write. Grandpa speaks or types; the AI listens and asks follow-ups.
- Active listening. The AI asks for names, places, years, and feelings, and comes back to unfinished stories.
- Memory between sessions. Each conversation continues the last one. If last time was the army, today it asks about the wedding.
- The AI writes, the family approves. Conversations become chapters (childhood, work, love). The family can read and correct them.
- Structured data on the side. Besides the prose, the AI extracts people, places, dates, and events. That is the base for a family-tree link.

## Why the family tree matters

This is the part that is more than “another AI book.” The story becomes part of the family history that great-grandchildren will open later.

1. **Export into trees.** Stories attach to a person’s profile in MyHeritage, Geni, FamilySearch, and similar apps. Format: GEDCOM plus attachments (text and audio).
2. **Reading the ancestors.** Opening grandpa’s profile shows his own words, not only birth and death dates.
3. **Linking people.** Grandpa mentions his friend Pepa from Kladno, born 1948. The AI extracts that as an entity and tries to find him in a genealogy database. If Pepa exists (even in someone else’s tree), a link is proposed.
4. **Network effect.** When Pepa’s granddaughter records Pepa’s memories, the two stories meet and fill each other in. One event, two points of view.

A real MyHeritage write API is a later step. MyHeritage does not have an open write API. For the hackathon: export + person extraction + a fake tree for the Pepa demo.

## Who it is for

Working answer for the pitch: the paying customer is the adult children or grandchildren, buying it as a gift. The user of the interview is the grandparent.

Still open:

- Web, mobile app, or a plain phone call? A phone call is simplest for seniors.
- What is the product called?

## Hackathon constraints

Event: **Cursor Hackathon Prague: Forge the Stack**. Check-in / submit project link: `https://spacexai-checkin.vercel.app/project`. Pitch: **1 minute** in the group round (2 minutes in finals). Prefer a public GitHub repo so technical judges can see what was actually built.

### Judging — Working product first

`Total = (Execution × 2) + Usefulness + Clarity` · max **20** · scale 1 missing / 3 solid / 5 standout

| Criterion | Question |
| --- | --- |
| **01 Execution** (×2) | Does it work? What was actually built? |
| **02 Usefulness** | Is the problem real, and would someone use this? |
| **03 Clarity** | Can we understand the demo and why it matters? |

Example on the slide: working focused tool = `4×2 + 4 + 5 = 17/20`.

Shape the product for these scores, not for feature count. A small thing that runs beats a wide unfinished app.

### Must-have (demo slice)

- English conversation where the AI asks a follow-up
- Memory across at least two sessions
- One biography chapter generated from the transcript
- People, places, and years extracted into structured form

### Nice-to-have (after the core works)

- GEDCOM export or mock tree import
- Pepa linked against a prepared fake tree by **real matching code** (not a hardcoded result); a human confirms the match
- A simple family reading page

### Demo flow

1. Grandpa (us in role) starts telling a childhood story; the AI asks a follow-up.
2. Second session: the AI continues from the previous topic.
3. Show the generated chapter.
4. Show extracted people and Pepa matched in the (demo) family tree.

Differentiation vs Storyworth / Remento: family-tree link (GEDCOM + person matching), not only a private book.

## Risks

| Risk | Mitigation |
| --- | --- |
| Speech recognition / noisy hall | Text chat is the reliable path; voice only if a real API key is present. Hold-to-talk. Backup recording. |
| Hallucinations in the biography | Chapters stick to the transcript; family approves. |
| Privacy / GDPR | Consent; export only with permission. |
| Wrong person link | Propose a match; a human confirms. |
| No genealogy write API | GEDCOM + mock tree for the hackathon. |

## What “done” looks like for the jury

A focused tool that works: an English conversation that continues a previous session, a chapter that only contains what was said, and extracted people with Pepa matched against demo tree data by real code.
