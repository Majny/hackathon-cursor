"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import type { ChapterView as ChapterViewData, CitedParagraph } from "@/lib/archive";
import type { Chapter, ChapterParagraph } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CitationChip, type ChipCitation } from "./CitationChip";
import { chapterStats, formatDate } from "./citations";

/**
 * One chapter of the family book. Data comes pre-joined from `getChapterView` (lib/archive):
 * numbered citations already point to /family/conversations/<sid>#<turnId>.
 * Family can correct a paragraph (✎) and approve the chapter.
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

  return (
    <article id={chapter.id} className="scroll-mt-28">
      <header className="mb-10 text-center">
        <p className="font-sans text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-brick">
          Chapter {chapterNo} · {view.topicLabel}
        </p>
        <h2 className="mt-3 font-(family-name:--font-display) text-4xl font-medium leading-tight tracking-tight text-ink sm:text-5xl">
          {chapter.title}
        </h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2 font-sans">
          {chapter.status === "approved" ? <Badge tone="moss">✓ Approved by the family</Badge> : <Badge>Draft</Badge>}
          {stats.unverified > 0 && <Badge tone="warn">{stats.unverified} need checking</Badge>}
          {stats.edited > 0 && <Badge tone="brick">✎ corrected by family</Badge>}
        </div>

        {/* Verified meter */}
        <div className="mx-auto mt-6 max-w-sm font-sans" aria-label={`${verified} of ${stats.total} paragraphs verified`}>
          <div className="flex gap-1.5" aria-hidden>
            {chapter.paragraphs.map((p) => (
              <span key={p.id} className={`h-2 flex-1 rounded-full ${p.verified ? "bg-moss" : "bg-warn"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-semibold text-moss">
              {verified} of {stats.total}
            </span>{" "}
            paragraphs backed by his own words{pct === 100 ? " ✓" : ""}
          </p>
        </div>
      </header>

      <div className="space-y-7">
        {chapter.paragraphs.map((p, i) => (
          <Paragraph
            key={p.id}
            p={p}
            citations={numberedById.get(p.id) ?? []}
            first={i === 0}
            speaker={speaker}
            onSave={saveParagraph}
          />
        ))}
      </div>

      {chapter.openQuestions.length > 0 && (
        <aside className="mt-12 rounded-2xl border border-dashed border-moss/50 bg-moss/5 p-6 font-sans sm:p-7">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-moss">Still to ask</p>
          <h3 className="mt-1 font-(family-name:--font-display) text-2xl font-medium text-ink">
            Tom will ask about these on a <em className="italic text-moss">future call</em>
          </h3>
          <ul className="mt-4 space-y-2.5 text-lg">
            {chapter.openQuestions.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-moss" aria-hidden />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <footer className="mt-10 flex flex-wrap items-center justify-center gap-3 font-sans">
        {chapter.status !== "approved" ? (
          <Button size="lg" onClick={approve} disabled={approving}>
            {approving ? "Approving…" : "✓ The family approves this chapter"}
          </Button>
        ) : (
          <span className="text-lg text-moss">✓ This chapter has been approved by the family.</span>
        )}
        {err && <span className="text-red-700">{err}</span>}
      </footer>
      <p className="mx-auto mt-6 max-w-[60ch] text-center font-sans text-sm leading-relaxed text-ink-soft">
        Written by AI from {view.sessionsUsed.length ? `call${view.sessionsUsed.length > 1 ? "s" : ""} ${view.sessionsUsed.join(" & ")}` : "the calls"} ·{" "}
        {chapter.model} · {formatDate(chapter.generatedAt)}. Every sentence links to what Grandpa actually said.
      </p>
    </article>
  );
}

function Paragraph({
  p,
  citations,
  first,
  speaker,
  onSave,
}: {
  p: ChapterParagraph;
  citations: ChipCitation[];
  first: boolean;
  speaker: string;
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
    <div
      id={p.id}
      className={`group relative scroll-mt-28 rounded-xl transition-colors ${
        unverified ? "-mx-4 border-l-4 border-warn bg-warn-soft/50 px-4 py-3" : ""
      }`}
    >
      {editing ? (
        <div className="font-sans">
          <label htmlFor={`edit-${p.id}`} className="mb-2 block text-sm font-medium text-ink-soft">
            Correct this paragraph. Your version is marked “corrected by family”.
          </label>
          <textarea
            id={`edit-${p.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, Math.ceil(draft.length / 70))}
            autoFocus
            className="w-full rounded-xl border border-brick/50 bg-card p-4 font-(family-name:--font-display) text-xl leading-relaxed text-ink outline-none focus:ring-2 focus:ring-brick/40"
          />
          <div className="mt-2 flex flex-wrap gap-2">
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
          className={`max-w-[65ch] font-(family-name:--font-display) text-[1.3rem] leading-[1.75] text-ink ${
            first
              ? "first-letter:float-left first-letter:mr-2.5 first-letter:mt-1 first-letter:text-[4.2rem] first-letter:font-medium first-letter:leading-[0.8] first-letter:text-brick"
              : ""
          }`}
        >
          {p.text}
          {citations.map((c) => (
            <CitationChip key={c.turnId} c={c} speaker={speaker} />
          ))}
          <button
            type="button"
            onClick={() => {
              setDraft(p.text);
              setEditing(true);
            }}
            title="Correct this paragraph"
            aria-label="Correct this paragraph"
            className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full align-middle font-sans text-base text-ink-soft opacity-40 transition hover:bg-paper-dark hover:text-brick hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-3 focus-visible:outline-brick group-hover:opacity-100"
          >
            ✎
          </button>
        </p>
      )}

      {(unverified || p.editedByFamily) && !editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2 font-sans">
          {unverified && <Badge tone="warn">⚠ Needs checking</Badge>}
          {p.editedByFamily && <Badge tone="brick">✎ corrected by family</Badge>}
          {unverified && citations.length === 0 && (
            <span className="text-sm text-ink-soft">We couldn’t find this in Grandpa’s own words yet.</span>
          )}
        </div>
      )}
      {p.warnings.length > 0 && !editing && (
        <ul className="mt-1 list-disc pl-6 font-sans text-sm text-ink-soft">
          {p.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
