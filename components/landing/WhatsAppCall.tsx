function WaGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

function PhoneIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
    </svg>
  );
}

/** Static illustration of Grandpa's phone during a WhatsApp call from Tom. */
export function WhatsAppCall() {
  return (
    <figure className="mx-auto w-[260px] sm:w-[280px]">
      <div
        className="rounded-[2.4rem] border-[9px] border-ink bg-ink shadow-[0_30px_60px_-30px_rgba(59,42,30,0.6)]"
        role="img"
        aria-label="Grandpa's phone during a WhatsApp call from Tom"
      >
        <div className="flex aspect-[9/18] flex-col rounded-[1.9rem] bg-[#0f332b] px-5 pb-7 pt-8 text-white">
          <div className="flex items-center justify-center gap-1.5 text-[0.7rem] text-white/70">
            <WaGlyph className="h-3.5 w-3.5 text-[#25d366]" />
            WhatsApp voice call
          </div>
          <div className="mt-8 flex flex-col items-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-brick font-(family-name:--font-display) text-[2rem]">
              T
            </div>
            <div className="mt-4 font-(family-name:--font-display) text-[1.6rem] leading-none">Tom</div>
            <div className="mt-1.5 text-[0.78rem] text-white/60">04:12</div>
          </div>
          <div className="mt-auto">
            <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/60">Grandpa Jerry</div>
            <p className="text-[0.95rem] leading-snug text-white/90">
              &ldquo;My father was waiting in the doorway. Pepa was grounded for the whole summer.&rdquo;
            </p>
            <div className="mt-5 flex justify-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5484d]">
                <PhoneIcon className="h-5 w-5 rotate-[135deg]" />
              </span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[0.8rem] text-ink-soft">
        Tom calls at a time Grandpa chose. He just picks up.
      </figcaption>
    </figure>
  );
}
