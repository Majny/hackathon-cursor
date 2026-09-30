import Link from "next/link";
import { getDb } from "@/lib/store";
import { LIFE_TOPICS, topicLabel } from "@/lib/topics";
import type { Chapter } from "@/lib/types";
import { ChapterView } from "@/components/book/ChapterView";
import { bookTitle } from "@/components/book/citations";

export const dynamic = "force-dynamic";

const QUOTE_LEN = 160;

export default async function BookPage() {
  const db = await getDb();
  const order = (c: Chapter) => {
    const i = LIFE_TOPICS.findIndex((t) => t.key === c.key);
    return i === -1 ? 99 : i;
  };
  const chapters = [...db.chapters].sort((a, b) => order(a) - order(b));

  const turnSessionMap: Record<string, string> = {};
  const turnText: Record<string, string> = {};
  for (const t of db.turns) {
    turnSessionMap[t.id] = t.sessionId;
    turnText[t.id] = t.text;
  }
  // Fill missing quotes from the transcript (server normally does this).
  const enriched = chapters.map((ch) => ({
    ...ch,
    paragraphs: ch.paragraphs.map((p) => ({
      ...p,
      citations: p.citations.map((c) => ({
        ...c,
        quote: c.quote || (turnText[c.turnId] ?? "").slice(0, QUOTE_LEN),
      })),
    })),
  }));

  return (
    <main className="mx-auto max-w-[44rem]">
      <div className="mb-14 border-b border-line pb-10 text-center">
        <p className="font-sans text-sm uppercase tracking-[0.3em] text-ink-soft">Rodinná kniha</p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-tight text-ink">{bookTitle(db.grandparent)}</h1>
        <p className="mt-3 font-serif text-xl italic text-ink-soft">
          vyprávěné vnukovi {db.grandparent?.grandchildName ?? "Tomášovi"}, zapsané s pomocí AI
        </p>
        {chapters.length > 1 && (
          <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 font-sans text-base">
            {chapters.map((ch, i) => (
              <a key={ch.id} href={`#${ch.id}`} className="text-brick hover:underline">
                {i + 1}. {ch.title}
              </a>
            ))}
          </nav>
        )}
        <p className="mt-6 font-sans text-sm text-ink-soft">
          Čísla za odstavci vedou k místu v povídání, kde to děda řekl. Žlutě jsou místa, která rodina ještě neověřila.
        </p>
      </div>

      {chapters.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-8 text-center font-sans">
          <p className="text-xl">Kniha je zatím prázdná.</p>
          <p className="mt-2 text-ink-soft">
            Kapitolu napíšete v <Link href="/family" className="text-brick underline">přehledu</Link> tlačítkem „Napsat kapitolu“.
          </p>
        </div>
      )}

      <div className="space-y-24">
        {enriched.map((ch, i) => (
          <ChapterView
            key={`${ch.id}-${ch.generatedAt}`}
            chapter={ch}
            chapterNo={i + 1}
            topicLabel={topicLabel(ch.key)}
            turnSessionMap={turnSessionMap}
          />
        ))}
      </div>

      <p className="mt-24 text-center font-serif text-2xl text-ink-soft">❦</p>
    </main>
  );
}
