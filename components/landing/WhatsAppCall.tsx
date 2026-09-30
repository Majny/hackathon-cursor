"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const CAPTIONS: { tom: boolean; text: string }[] = [
  { tom: true, text: "Hi Grandpa! Last time you and Pepa ran off to the fair in Prague. How did it go when you got home?" },
  { tom: false, text: "Oh, my father was waiting in the doorway. With the belt." },
  { tom: true, text: "No! And Pepa?" },
  { tom: false, text: "Grounded for the whole summer. He married my sister Věrka anyway." },
];

const RING_S = 3;
const CAPTION_S = 3;
const CYCLE_S = RING_S + CAPTIONS.length * CAPTION_S;

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

/**
 * A phone mockup that loops: incoming WhatsApp call from "Tom" → answered → live captions.
 * Purely illustrative: the real call is placed by the backend, there is no button to press.
 */
export function WhatsAppCall() {
  const reduce = useReducedMotion();
  // One clock drives the loop: RING_S seconds of ringing, then CAPTION_S seconds per caption.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);

  const t = reduce ? RING_S : tick % CYCLE_S;
  const phase: 0 | 1 = t < RING_S ? 0 : 1;
  const secs = Math.max(0, t - RING_S);
  const line = Math.min(CAPTIONS.length - 1, Math.floor(secs / CAPTION_S));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const cap = CAPTIONS[line];

  return (
    <div className="relative mx-auto w-[260px] sm:w-[280px]" role="img" aria-label="Grandpa's phone showing an incoming WhatsApp call from Tom">
      <div className="pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(37,211,102,0.18),transparent_65%)] blur-2xl" />
      <div className="relative rounded-[2.6rem] border-[10px] border-[#2a1f17] bg-[#2a1f17] shadow-[0_40px_80px_-30px_rgba(59,42,30,0.75)]">
        <div className="relative flex aspect-[9/19] flex-col overflow-hidden rounded-[2rem] bg-[linear-gradient(180deg,#0f3d33_0%,#0b2a24_55%,#081d19_100%)] px-5 pb-7 pt-9 text-white">
          {/* notch */}
          <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#2a1f17]" />
          <div className="flex items-center justify-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-white/70">
            <WaGlyph className="h-3.5 w-3.5 text-[#25d366]" />
            {phase === 0 ? "WhatsApp voice call" : "End-to-end encrypted"}
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="relative">
              {phase === 0 && !reduce &&
                [0, 1].map((i) => (
                  <motion.span
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-[#25d366]/50"
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.9, ease: "easeOut" }}
                  />
                ))}
              <div className="relative grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe9c9,#c4652f_60%,#8f3f1f)] font-(family-name:--font-display) text-[2.4rem] text-[#fff6e8] shadow-lg">
                T
              </div>
            </div>
            <div className="mt-4 font-(family-name:--font-display) text-[1.7rem] leading-none">Tom</div>
            <div className="mt-1.5 text-[0.78rem] text-white/65">
              {phase === 0 ? "Incoming call…" : `${mm}:${ss}`}
            </div>
          </div>

          <div className="mt-auto">
            <AnimatePresence mode="wait">
              {phase === 0 ? (
                <motion.div
                  key="ring"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-end justify-between px-3"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e5484d]">
                      <PhoneIcon className="h-6 w-6 rotate-[135deg]" />
                    </span>
                    <span className="text-[0.65rem] text-white/60">Decline</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.span
                      className="grid h-14 w-14 place-items-center rounded-full bg-[#25d366]"
                      animate={reduce ? undefined : { y: [0, -6, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <PhoneIcon className="h-6 w-6" />
                    </motion.span>
                    <span className="text-[0.65rem] text-white/60">Accept</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={`cap-${line}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                  <div className={`mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] ${cap.tom ? "text-[#25d366]" : "text-[#ffcf9e]"}`}>
                    {cap.tom ? "Tom" : "Grandpa Jarda"}
                  </div>
                  <p className="min-h-[5.2rem] font-(family-name:--font-display) text-[0.98rem] italic leading-snug text-white/90">
                    “{cap.text}”
                  </p>
                  <div className="mt-4 flex justify-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#e5484d]/90">
                      <PhoneIcon className="h-5 w-5 rotate-[135deg]" />
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
