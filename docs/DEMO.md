# Demo scénář (PLAN §14)

## Příprava (T−10 min)
- Na prod načíst **after-s1**: `/demo` → „Načíst: po povídání 1“ (nebo `curl -X POST <url>/api/demo/load -H 'Content-Type: application/json' -d '{"snapshot":"after-s1"}'`).
- `/demo`: všechny odznaky v „Stav“ zelené; v „Co si AI pamatuje“ je příští první věta:
  > Ahoj dědo! Minule jsi mi začal vyprávět, jak jste s Pepou v padesátém osmém utekli na pouť do Prahy – tak jak to doma dopadlo?
- Render zahřát (otevřít URL 2 min předem).
- Záložky: `/`, `/rodina/kniha`, `/rodina/lide`, `/rodina/strom`, `/demo`.
- Headset/mikrofon u „dědy“, AI z reproduktoru notebooku, echo cancellation zapnuté. Hotspot připravený.
- Po živé session na `/demo` zkontrolovat kontrolku **„první věta agenta == firstMessage“** (zelená = paměť prošla).

## Co je ve snapshotech
| snapshot | obsah |
|---|---|
| `empty` | jen děda + strom (placeholder) |
| `after-s1` | povídání 1 „Dětství na Kladně“ (20 replik): komíny Poldovky, maminka Anna a buchty, táta František v huti, sestra Věrka, fotbal s Pepou Dvořákem („o dům vedle, o dva roky mladší“), nedořečený útěk na pouť do Prahy 1958. Otevřené vlákno `th-pout`, osoby Pepa/Anna/František/Věrka, shoda Pepa → **I6 Josef Dvořák** (`suggested`, 100 %, návnady I13 a I12 v `alsoConsidered`). Celý strom z `data/fake-tree.json`. |
| `after-s2` | + povídání 2 (16 replik): dovyprávění pouti (tramvají, pěšky, bez peněz, v noci, řemen, zaracha, „Pepa si pak vzal naši Věrku“) a přechod k vojně v Jihlavě 1965. `th-pout` vyřešeno v s2, nové vlákno `th-vojna`. Kapitola **„Kluk od komínů Poldovky“** (5 odstavců, všechny citace = repliky dědy, roky i jména ověřené). Shoda stále `suggested` (potvrzuje se živě). |

Uložení živého stavu jako záloha: `STORE=file npx tsx scripts/save-snapshot.ts after-s2-live` (pro Supabase spustit s env proměnnými; `/api/demo/load` přijímá i `after-s2-live`).

## Repliky „dědy“ pro živé povídání 2 (česky, krátké věty, blízko mikrofonu)
AI začne: *„Ahoj dědo! Minule jsi mi začal vyprávět, jak jste s Pepou v padesátém osmém utekli na pouť do Prahy – tak jak to doma dopadlo?“*

1. „Jo, ta pouť. To bylo v roce 1958, v létě. Mně bylo dvanáct a Pepovi deset.“
2. „Kus cesty jsme jeli tramvají, na černo, a pak pěšky. Peníze jsme neměli žádný, ani korunu.“
3. „Vrátili jsme se v noci. Táta stál ve dveřích s řemenem. A Pepa dostal zaracha na celý prázdniny.“
4. „A víš, co je nejlepší? Pepa si pak vzal naši Věrku. Takže z kamaráda se mi stal švagr.“
5. (pokud je čas) „Pak jsem se vyučil a v roce 1965 mě vzali na vojnu. Do Jihlavy.“
6. Konec: „Tak dobře, Tomáši, o vojně ti řeknu příště.“ → tlačítko **Skončit** → „Příště se zeptám na: vojna v Jihlavě“.

Pro 120 s / 60 s stačí replika 1+3+4 spojená do jedné: *„To bylo v padesátým osmým. Jeli jsme tramvají a pak pěšky, bez peněz. Táta na mě čekal s řemenem. A Pepa si pak vzal naši Věrku.“*

## 3 minuty (plná verze)
1. **(20 s) Problém, EN** – viz pitch níže.
2. **(25 s) Session 1:** `/rodina/povidani/s1` – včera děda vyprávěl o dětství na Kladně, o Pepovi, a nedořekl příběh s poutí (poslední repliky).
3. **(50 s) Session 2 živě:** `/` → Povídat. AI řekne opener o pouti (titulky + EN řádek). Děda repliky 1–4, AI se doptá. Skončit → „Příště se zeptám na: vojna v Jihlavě“.
4. **(40 s) Kniha** `/rodina/kniha`: kapitola „Kluk od komínů Poldovky“ → klik na citaci ukáže doslovnou větu dědy → štítek „neověřeno“ jako ochrana proti halucinacím → rodina opraví jedno slovo (tužka).
   - Pokud finalize/kapitola nestihne: `/demo` → „Načíst: po povídání 2“ (< 1 s) a ukázat připravenou kapitolu.
5. **(35 s) Lidé a strom** `/rodina/lide`: Pepa z vyprávění → Josef Dvořák *1948 Kladno, manžel dědovy sestry Věry, 100 %; návnady (strýc Josef Novák 1924, bratranec Josef Horák 1946 Rakovník) vyřazené podle roku a příjmení → **[Ano, je to on]** → `/rodina/strom` uzel se rozsvítí → Stáhnout GEDCOM.
6. **(10 s) Závěr** – viz pitch.

## 120 s (finále)
Body 1 (10 s), 3 (40 s, jen jedna spojená odpověď dědy), 4 (25 s), 5 (25 s), 6 (10 s). Finalize neřešit: v druhé záložce `/demo` načíst `after-s2` a ukázat připravenou kapitolu.

## 60 s (skupinové kolo)
Session je pre-warmed (`/?warm=1`, AI už řekla úvodní větu o pouti). (10 s) problém → (20 s) „AI remembers last conversation“ + jedna odpověď dědy → (15 s) citace v knize → (15 s) potvrzení Pepy + GEDCOM. Když se hlas zasekne, rovnou kniha a strom.

---

## EN pitch – 60 s
> Our grandparents' stories disappear with them, and nobody has time to record and write them down.
> Meet an AI grandchild. It calls grandpa Jaroslav in Czech, with a real voice, and just listens.
> *(grandpa's screen)* Yesterday he started a story about running away to a fair in Prague in 1958 and didn't finish. Today, the AI remembered – its very first sentence picks up exactly where he stopped.
> *(grandpa answers)*
> Every conversation becomes a family book. Each paragraph is cited to grandpa's own words – click it and you hear what he actually said; anything we can't verify is flagged, so no hallucinated family history.
> And the people he mentions are matched to the family tree: "Pepa from next door" is Josef Dvořák, born 1948 – grandpa's brother-in-law. A human confirms, and it exports as standard GEDCOM to MyHeritage or FamilySearch.
> Memory across sessions, cited chapters, a real family tree. Built this afternoon, live on Render.

## EN pitch – 120 s
> **Problem.** When our grandparents go, their stories go with them. Families mean to record them, but nobody has the time, and a phone recording nobody transcribes is not a family history.
>
> **Solution.** We built an AI grandchild. Grandpa Jaroslav, born 1946 in Kladno, just presses one big button and talks – in Czech, by voice, to "Tomáš", a curious grandchild powered by Claude through ElevenLabs.
>
> **Memory.** Yesterday he told us about the steelworks chimneys, his mum's Saturday buns, and his friend Pepa – and he stopped in the middle of a story: running away to a fair in Prague in 1958. Watch the first sentence today. *(AI: "Grandpa! Last time you started telling me how you and Pepa ran away to the fair in Prague – so how did it end at home?")* That's not scripted – it's the summary of the last session injected into the agent. *(grandpa answers: tram, walking, no money, dad waiting with a belt, and "Pepa later married my sister Věrka".)*
>
> **The book.** After the call, the conversation becomes a chapter – "The boy from under the Poldi chimneys". Every paragraph carries citations to grandpa's exact words. Click one and you see the original sentence. Any year or name that isn't in the cited words gets an "unverified" flag. The family can edit and approve.
>
> **The tree.** People from the stories are matched against the family tree. "Pepa Dvořák, next door, two years younger" becomes Josef Dvořák, born 1948 in Kladno – with the score breakdown, and the decoys it rejected: an uncle Josef born 1924, a cousin Josef Horák from Rakovník. A human always confirms. Then one click exports standard GEDCOM for MyHeritage, Geni or FamilySearch.
>
> **Close.** Claude as the curious grandchild, a Czech voice via ElevenLabs, memory across sessions, cited chapters and a real family tree. Built with Cursor and Claude Code this afternoon – live on Render.
