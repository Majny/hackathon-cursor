"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchDocs, type SearchDoc, type SearchHit, type SearchKind } from "@/lib/archive";

const KIND_LABEL: Record<SearchKind, string> = {
  person: "People",
  place: "Places",
  event: "Events",
  chapter: "Stories",
  quote: "In his words",
  conversation: "Conversations",
};
const SUGGESTIONS = ["Pepa", "Kladno", "1958", "verka", "Jihlava", "fair"];

/** Header pill + ⌘K / Ctrl-K / "/" command palette over the whole archive. */
export function SearchPalette({ docs }: { docs: SearchDoc[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const reduce = useReducedMotion();

  const hits = useMemo(() => searchDocs(docs, q, 5), [docs, q]);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "/" && !open) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (hit: SearchHit | undefined) => {
    if (!hit) return;
    close();
    router.push(hit.href);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card px-3.5 text-[0.95rem] text-ink-soft transition-colors hover:border-brick/50 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>Search</span>
        <kbd className="hidden rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans text-xs text-ink-soft sm:inline">
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="search-overlay"
            className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[10vh] backdrop-blur-[2px]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search the family archive"
              className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_24px_60px_-20px_rgba(59,42,30,0.45)]"
              initial={reduce ? false : { opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 border-b border-line px-5 py-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0 text-brick">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder="Search people, places, years, stories…"
                  aria-label="Search"
                  aria-controls="search-results"
                  aria-activedescendant={hits[active] ? `sr-${active}` : undefined}
                  className="min-w-0 flex-1 bg-transparent text-[1.15rem] text-ink placeholder:text-ink-soft/70 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink"
                >
                  Esc
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {!q.trim() ? (
                  <div className="px-5 py-6">
                    <p className="text-ink-soft">Everything grandpa told Tom, in one place. Try:</p>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            setQ(s);
                            inputRef.current?.focus();
                          }}
                          className="min-h-11 rounded-full border border-line bg-paper px-4 text-ink hover:border-brick/50 hover:text-brick"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : hits.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <p className="font-(family-name:--font-display) text-xl text-ink">Grandpa hasn&apos;t mentioned “{q}” yet.</p>
                    <p className="mt-1 text-ink-soft">Tom might ask about it on a future call.</p>
                  </div>
                ) : (
                  <ul id="search-results" ref={listRef} role="listbox" className="py-2">
                    {hits.map((h, i) => {
                      const header = i === 0 || hits[i - 1].kind !== h.kind;
                      return (
                        <Fragment key={h.id}>
                          {header && (
                            <li role="presentation" className="px-5 pt-3 pb-1 text-[0.7rem] font-semibold tracking-[0.2em] text-brick uppercase">
                              {KIND_LABEL[h.kind]}
                            </li>
                          )}
                          <li
                            id={`sr-${i}`}
                            data-idx={i}
                            role="option"
                            aria-selected={i === active}
                            onMouseMove={() => setActive(i)}
                            onClick={() => go(h)}
                            className={`mx-2 flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ${
                              i === active ? "bg-paper-dark" : ""
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span
                                className={`block truncate text-ink ${
                                  h.kind === "quote" ? "font-(family-name:--font-display) italic" : "font-medium"
                                }`}
                              >
                                {h.kind === "quote" ? `“${h.title}”` : h.title}
                              </span>
                              <span className="block truncate text-sm text-ink-soft">{h.subtitle}</span>
                              {h.snippet && h.kind !== "quote" && (
                                <span className="mt-0.5 line-clamp-2 block text-sm text-ink-soft">
                                  {h.snippet.before}
                                  <mark className="rounded bg-warn-soft px-0.5 text-ink">{h.snippet.match}</mark>
                                  {h.snippet.after}
                                </span>
                              )}
                            </span>
                            {i === active && <span aria-hidden className="mt-1 text-sm text-ink-soft">↵</span>}
                          </li>
                        </Fragment>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line bg-paper px-5 py-2.5 text-xs text-ink-soft">
                <span><kbd className="font-sans">↑↓</kbd> move</span>
                <span><kbd className="font-sans">↵</kbd> open</span>
                <span><kbd className="font-sans">Esc</kbd> close</span>
                <span className="ml-auto">Accents optional: “verka” finds Vera</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
