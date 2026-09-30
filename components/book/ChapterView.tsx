"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { ChapterView as ChapterViewData, CitedParagraph } from "@/lib/archive";
import type { Chapter, ChapterParagraph } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CitationChip, type ChipCitation } from "./CitationChip";
import { chapterStats, formatDate } from "./citations";

/**
 * One chapter of the family book. Data comes pre-joined from `getChapterView` (lib/archive):
 * numbered citations already point to /family/conversations/<sid>#<turnId>.
 * Family can correct a paragraph and approve the chapter.
 */
export function ChapterView({
  view,
  chapterNo,
  speaker = "Grandpa",
}: {
  view: ChapterViewData;
  chapterNo: number;
  speaker?: string;
}) {
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter>(view.chapter);
  const [approving, setApproving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Keep in sync when the server re-renders (router.refresh).
  useEffect(() => setChapter(view.chapter), [view.chapter]);

  const numberedById = new Map<string, CitedParagraph["numbered"]>(view.paragraphs.map((p) => [p.id, p.numbered]));
  const stats = chapterStats(chapter);
  const verified = stats.total - stats.unverified;
  const pct = stats.total ? Math.round((verified / stats.total) * 100) : 0;

  const approve = async () => {
    setApproving(true);
    setErr(null);
    try {
      setChapter(await api.approveChapter(chapter.id));
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const saveParagraph = async (paragraphId: string, text: string) => {
    const updated = await api.editParagraph(chapter.id, paragraphId, text);
    setChapter(updated);
    router.refresh();
  };

  const [correcting, setCorrecting] = useState(false);

  return (
    <article id={chapter.id} className="scroll-mt-28">
      <header className="mb-10">
        <p className="font-sans text-lg text-ink-soft">
          Story {chapterNo} · {view.topicLabel}
          {chapter.status === "approved" && <span className="ml-2 text-moss">· Approved by the family</span>}
        </p>
        <h2 className="mt-2 font-(family-name:--font-display) text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
          {chapter.title}
        </h2>
      </header>

      {correcting && (
        <p className="mb-6 rounded-xl bg-paper-dark px-5 py-4 font-sans text-lg text-ink">
          Click “Correct this” under any paragraph to fix it. When you’re done, press “Finish correcting”.
        </p>
      )}

      <div className="space-y-8">
        {chapter.paragraphs.map((p, i) => (
          <Paragraph
            key={p.id}
            p={p}
            citations={numberedById.get(p.id) ?? []}
            first={i === 0}
            speaker={speaker}
            correcting={correcting}
            onSave={saveParagraph}
          />
        ))}
      </div>

      {chapter.openQuestions.length > 0 && (
        <aside className="mt-12 rounded-2xl border border-line bg-card p-6 font-sans sm:p-7">
          <h3 className="font-(family-name:--font-display) text-2xl font-medium text-ink">Questions for the next call</h3>
          <ul className="mt-4 space-y-2.5 text-lg">
            {chapter.openQuestions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-moss" aria-hidden />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <footer className="mt-12 rounded-2xl border border-line bg-card p-6 font-sans sm:p-7">
        {chapter.status !== "approved" ? (
          <>
            <p className="text-lg text-ink">Does this story sound right?</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={approve} disabled={approving}>
                {approving ? "Saving…" : "Approve this story"}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setCorrecting((c) => !c)}>
                {correcting ? "Finish correcting" : "Suggest a correction"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-lg text-moss">Approved by the family.</p>
            <Button variant="secondary" onClick={() => setCorrecting((c) => !c)}>
              {correcting ? "Finish correcting" : "Suggest a correction"}
            </Button>
          </div>
        )}
        {err && <p className="mt-3 text-red-700">{err}</p>}

        <details className="mt-6 text-base text-ink-soft">
          <summary className="min-h-11 cursor-pointer py-2 focus-visible:outline-3 focus-visible:outline-brick">Details</summary>
          <div className="space-y-2 pb-1 pt-2">
            <p>
              {verified} of {stats.total} paragraphs ({pct}%) come straight from {speaker}’s own words.
              {stats.unverified > 0 ? ` ${stats.unverified} still need checking.` : ""}
              {stats.edited > 0 ? ` ${stats.edited} corrected by the family.` : ""}
            </p>
            <p>
              Written by AI from{" "}
              {view.sessionsUsed.length ? `call${view.sessionsUsed.length > 1 ? "s" : ""} ${view.sessionsUsed.join(" & ")}` : "the calls"} ·{" "}
              {chapter.model} · {formatDate(chapter.generatedAt)}.
            </p>
          </div>
        </details>
      </footer>
    </article>
  );
}

function Paragraph({
  p,
  citations,
  first,
  speaker,
  correcting,
  onSave,
}: {
  p: ChapterParagraph;
  citations: ChipCitation[];
  first: boolean;
  speaker: string;
  correcting: boolean;
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
      setErr(e instanceof Error ? e.message : "Saving failed");
    } finally {
      setSaving(false);
    }
  };

  const unverified = !p.verified;

  return (
    <div id={p.id} className="scroll-mt-28">
      {editing ? (
        <div className="font-sans">
          <label htmlFor={`edit-${p.id}`} className="mb-2 block text-lg text-ink">
            Write how it should be. We’ll mark it “corrected by the family”.
          </label>
          <textarea
            id={`edit-${p.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, Math.ceil(draft.length / 70))}
            autoFocus
            className="w-full rounded-xl border border-brick/50 bg-card p-4 font-(family-name:--font-display) text-xl leading-relaxed text-ink outline-none focus:ring-2 focus:ring-brick/40"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <Button onClick={save} disabled={saving || !draft.trim()}>
              {saving ? "Saving…" : "Save correction"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(p.text);
                setEditing(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            {err && <span className="self-center text-red-700">{err}</span>}
          </div>
        </div>
      ) : (
        <p
          className={`max-w-[65ch] font-(family-name:--font-display) text-[1.3rem] leading-[1.8] text-ink ${
            first
              ? "first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[4.2rem] first-letter:font-medium first-letter:leading-[0.8] first-letter:text-brick"
              : ""
          }`}
        >
          {p.text}
          {citations.map((c) => (
            <CitationChip key={c.turnId} c={c} speaker={speaker} />
          ))}
        </p>
      )}

      {!editing && (unverified || p.editedByFamily || correcting) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-base text-ink-soft">
          {unverified && citations.length === 0 && <span>We haven’t found this in {speaker}’s own words yet.</span>}
          {p.editedByFamily && <span>Corrected by the family.</span>}
          {correcting && (
            <button
              type="button"
              onClick={() => {
                setDraft(p.text);
                setEditing(true);
              }}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-ink hover:border-brick hover:text-brick focus-visible:outline-3 focus-visible:outline-brick"
            >
              Correct this
            </button>
          )}
        </div>
      )}
      {p.warnings.length > 0 && !editing && correcting && (
        <ul className="mt-1 list-disc pl-6 font-sans text-base text-ink-soft">
          {p.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
