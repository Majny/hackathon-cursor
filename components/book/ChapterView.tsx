"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { Chapter, ChapterParagraph } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CitationChip } from "./CitationChip";
import { chapterStats, formatCzDate, numberCitations, type NumberedCitation } from "./citations";

export function ChapterView({
  chapter: initial, topicLabel, chapterNo, turnSessionMap,
}: {
  chapter: Chapter; topicLabel: string; chapterNo: number; turnSessionMap: Record<string, string>;
}) {
  const router = useRouter();
  const [chapter, setChapter] = useState(initial);
  const [approving, setApproving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const numbered = numberCitations(chapter.paragraphs, turnSessionMap);
  const stats = chapterStats(chapter);

  const approve = async () => {
    setApproving(true);
    setErr(null);
    try {
      setChapter(await api.approveChapter(chapter.id));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Schválení selhalo");
    } finally {
      setApproving(false);
    }
  };

  const saveParagraph = async (paragraphId: string, text: string) => {
    const updated = await api.editParagraph(chapter.id, paragraphId, text);
    setChapter(updated);
    router.refresh();
  };

  return (
    <article id={chapter.id} className="scroll-mt-24">
      <header className="mb-8 text-center">
        <p className="font-sans text-sm uppercase tracking-[0.25em] text-brick">
          Kapitola {chapterNo} · {topicLabel}
        </p>
        <h2 className="mt-2 font-serif text-4xl font-semibold leading-tight text-ink">{chapter.title}</h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2 font-sans">
          {chapter.status === "approved" ? <Badge tone="moss">✓ Schváleno rodinou</Badge> : <Badge>Koncept</Badge>}
          {stats.unverified > 0 && <Badge tone="warn">{stats.unverified}× neověřeno</Badge>}
          {stats.edited > 0 && <Badge tone="brick">✎ upraveno rodinou</Badge>}
        </div>
      </header>

      <div className="space-y-6">
        {chapter.paragraphs.map((p, i) => (
          <Paragraph key={p.id} p={p} citations={numbered[i] ?? []} first={i === 0} onSave={saveParagraph} />
        ))}
      </div>

      {chapter.openQuestions.length > 0 && (
        <aside className="mt-10 rounded-2xl border border-dashed border-brick/40 bg-brick/5 p-6 font-sans">
          <h3 className="mb-3 font-serif text-2xl font-semibold text-brick-dark">Otázky na příště</h3>
          <ul className="space-y-2 text-lg">
            {chapter.openQuestions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-brick">?</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-3 font-sans">
        {chapter.status !== "approved" ? (
          <Button size="lg" onClick={approve} disabled={approving}>
            {approving ? "Schvaluji…" : "✓ Schválit kapitolu"}
          </Button>
        ) : (
          <span className="text-lg text-moss">Kapitola je schválená rodinou.</span>
        )}
        {err && <span className="text-red-700">{err}</span>}
      </footer>
      <p className="mt-4 text-center font-sans text-sm text-ink-soft">
        Napsáno {formatCzDate(chapter.generatedAt)} · {chapter.model}
      </p>
    </article>
  );
}

function Paragraph({
  p, citations, first, onSave,
}: {
  p: ChapterParagraph; citations: NumberedCitation[]; first: boolean;
  onSave: (paragraphId: string, text: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(p.text);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave(p.id, draft.trim());
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Uložení selhalo");
    } finally {
      setSaving(false);
    }
  };

  const unverified = !p.verified;

  return (
    <div
      className={`group relative rounded-lg transition-colors ${
        unverified ? "-mx-4 border-l-4 border-warn bg-warn-soft/50 px-4 py-2" : ""
      }`}
    >
      {editing ? (
        <div className="font-sans">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, Math.ceil(draft.length / 70))}
            autoFocus
            className="w-full rounded-xl border border-brick/50 bg-card p-4 font-serif text-xl leading-relaxed text-ink outline-none focus:ring-2 focus:ring-brick/40"
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={save} disabled={saving || !draft.trim()}>{saving ? "Ukládám…" : "Uložit opravu"}</Button>
            <Button variant="secondary" onClick={() => { setDraft(p.text); setEditing(false); }} disabled={saving}>
              Zrušit
            </Button>
            {err && <span className="self-center text-red-700">{err}</span>}
          </div>
        </div>
      ) : (
        <p
          className={`font-serif text-xl leading-relaxed text-ink ${
            first ? "first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.85] first-letter:text-brick" : ""
          }`}
        >
          {p.text}
          {citations.map((c) => (
            <CitationChip key={c.turnId} c={c} />
          ))}
          <button
            type="button"
            onClick={() => { setDraft(p.text); setEditing(true); }}
            title="Opravit odstavec"
            aria-label="Opravit odstavec"
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full align-middle font-sans text-base text-ink-soft opacity-40 transition hover:bg-paper-dark hover:text-brick hover:opacity-100 group-hover:opacity-100"
          >
            ✎
          </button>
        </p>
      )}

      {(unverified || p.editedByFamily) && !editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2 font-sans">
          {unverified && <Badge tone="warn">⚠ neověřeno</Badge>}
          {p.editedByFamily && <Badge tone="brick">✎ upraveno rodinou</Badge>}
          {unverified && citations.length === 0 && <span className="text-sm text-ink-soft">Odstavec nemá citaci z povídání.</span>}
        </div>
      )}
      {p.warnings.length > 0 && !editing && (
        <ul className="mt-1 list-disc pl-6 font-sans text-sm text-ink-soft">
          {p.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
