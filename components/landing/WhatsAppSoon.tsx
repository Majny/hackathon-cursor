"use client";

import { useState } from "react";

/** "Call Tom on WhatsApp" entry point — the WhatsApp channel isn't live yet, so it explains that instead. */
export function WhatsAppSoon() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-5 py-2.5 text-[0.95rem] font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/20 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-current">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
        </svg>
        Call Tom on WhatsApp
        <span className="rounded-full bg-ink/85 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-paper uppercase">
          Coming soon
        </span>
      </button>
      {open && (
        <p role="status" className="mt-3 max-w-md text-[0.9rem] leading-relaxed text-ink-soft">
          WhatsApp calling is coming soon: Tom will call Grandpa at a time he chooses, no app or setup needed.
          Until then, you can{" "}
          <a href="/talk" className="font-semibold text-brick underline underline-offset-2">
            talk to Tom in your browser
          </a>
          .
        </p>
      )}
    </div>
  );
}
