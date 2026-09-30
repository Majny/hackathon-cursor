## Cursor Hackathon Prague: Forge the Stack (30 Sep 2026)

I found the event. It's listed on Luma, and the organizers' own slide deck (an Open-slide deck made in Cursor) is in a public GitHub repo, including the judging rubric and the final-round format.

### Confirmed (Luma page + organizer slide repo)
- **Name / theme:** "Cursor Hackathon Prague: Forge the Stack". The tagline is "One afternoon to build the tools developers actually need": platform tools, internal utilities and developer products. The deck title slide reads "30 . 09 . 2026 · PRAGUE · FORGE THE STACK" and the footer reads "cursor hackathon · prague #1", so this is the first one in Prague.
- **Venue:** Productboard Czechia s.r.o., Boudníkova 3, 180 00 Praha 8 (Palmovka).
- **Schedule** (a single afternoon, about 4.5 h of build time):
  - 12:30 Doors open and networking
  - 13:00 Kickoff: briefing, theme, team formation (teams form on site)
  - 13:30 to 18:00 Build sprint, "ship a working demo". The deck has a countdown slide to **18:00 Europe/Prague**, so 18:00 is effectively the code freeze.
  - 18:00 to 19:00 Pitches, voting and prizes (top 3)
  - 19:30+ Afterparty at Karlínská Holka, sponsored by incident.io
- **Organizers (Cursor / SpaceXAI community ambassadors):** Ivo Klimša, Dejan Lazeski, Eleanor Menchú, Kornel Dubieniecki, Chin Man Yeung. About 69 to 74 people registered, and registration needed approval.
- **What to bring (Luma):** laptop and charger, **Cursor IDE pre-installed**, optionally **Grok Bot**, and dev-tooling ideas.
- **Sponsors:** Productboard (venue) and incident.io (afterparty). I found no sponsor API credits listed on the Luma page.
- **Jury:** Daniel Hejl (Co-founder & CAIO, Productboard), Ben King (Product Engineer, incident.io), Petr Podrouzek (CTO, IP Fabric, intro "Finds security gaps"), Kate Douskova (pitch coach and advisor).
- **Pitch format:**
  1. Group round: 4 groups with 1 judge each, **1 minute per project**.
  2. Shortlist: each judge picks their top 3, giving 12 finalists.
  3. Final round: present to everyone, **2 minutes including pitch and questions**.
  4. Winners: the full jury scores the finalists, giving 1st, 2nd and 3rd.
  - Slide text: "Show the product working. Make the problem and value clear."
- **Judging rubric ("Working product first"):** each criterion is scored 1 to 5, where 1 = missing, 3 = solid, 5 = standout.
  - **Execution ×2**: "Does it work? What was actually built?"
  - **Usefulness ×1**: "Is the problem real, and would someone use this?"
  - **Clarity ×1**: "Can we understand the demo and why it matters?"
  - Total = Execution×2 + Usefulness + Clarity, max 20. The deck's example is "Working focused tool 4×2+4+5 = 17/20".
- **Submission / check-in:** a QR code on the deck ("Add your project / Scan to check in") points to https://spacexai-checkin.vercel.app/project. The form has **Project name** (required) plus optional Participant, **GitHub link** and **Web page**. So the likely deliverable is a GitHub repo and optionally a live URL. There is **no Devpost and no video requirement**.
- **Prizes:** gold, silver and bronze for the top 3. Specific prize contents were not published.

### Context
Cursor was acquired by SpaceXAI (the xAI/SpaceX merger), with the deal completed around 14 Aug 2026 per 9to5Mac. This is why the Luma calendar is branded "SpaceXAI Community" and Grok Bot / Grok models get promoted.

### Inferred / not confirmed
- **Team size:** not stated anywhere. Teams form at kickoff, and solo entries are probably allowed.
- **Using Cursor:** strongly expected (Cursor IDE pre-installed, Cursor-branded event), but not explicitly listed as a judging requirement.
- **Credits:** I found no specific credits for this event. At other community Cursor/SpaceXAI events, finalists got about $20 of Cursor credits, and Grok credits were shared in the community WhatsApp. Ask on site.
- **Implications for our project:**
  - Build time is only about 4.5 h.
  - Execution counts double, so a working end-to-end demo matters most.
  - Be ready for a 1-minute pitch in the group round and a 2-minute pitch plus Q&A if we reach the final.
  - Have a GitHub repo and ideally a deployed URL ready for check-in before 18:00.
  - Our theme fit is weaker: "AI životopisec pro prarodiče" (an AI biographer for grandparents) is not a developer tool. The theme looks like guidance rather than a hard rule, but this is not confirmed.

### Sources
- Luma event: https://luma.com/cursor-mljb
- Luma calendar: https://luma.com/cursorcommunity
- Organizer slide repo: https://github.com/ivoklimsa/spacexai_events. PR #1 is https://github.com/ivoklimsa/spacexai_events/pull/1 and branch `cursor/prague-hackathon-slides-eee5` (commit cf52897) holds the format, rubric and check-in slides. File: slides/prague/index.tsx
- Live deck: https://spacexai-events.vercel.app/s/prague
- Check-in form: https://spacexai-checkin.vercel.app/project
- Acquisition context: https://9to5mac.com/2026/08/14/spacex-lands-deal-to-likely-purchase-claude-code-and-openai-codex-competitor/
- Other Cursor/SpaceXAI hackathons (credits norms): https://luma.com/cursor-hack-benin, https://luma.com/cursor-td9f, https://forum.cursor.com/t/new-event-cursor-hackathon-the-hague/161569