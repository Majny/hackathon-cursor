"use client";
import { useState } from "react";

export function TextFallback({
  onSend, busy, reason,
}: { onSend: (text: string) => Promise<void>; busy: boolean; reason?: string | null }) {
  const [text, setText] = useState("");
  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    await onSend(t);
  };
  return (
    <form
      className="flex w-full flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {reason && <p className="rounded-xl bg-warn-soft px-4 py-2 text-lg text-ink">{reason}</p>}
      <label htmlFor="talk-text" className="text-xl text-ink-soft">Type what you’d like to say:</label>
      <textarea
        id="talk-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={3}
        className="w-full rounded-2xl border-2 border-line bg-card p-4 text-2xl text-ink focus:border-brick focus:outline-none"
        placeholder="Well, it went like this…"
      />
      <button
        type="submit"
        disabled={busy || !text.trim()}
        className="self-end rounded-2xl bg-brick px-8 py-4 text-2xl font-medium text-white hover:bg-brick-dark disabled:opacity-50"
      >
        {busy ? "Thinking…" : "Send"}
      </button>
    </form>
  );
}
