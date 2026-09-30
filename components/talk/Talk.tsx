"use client";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { MemoryContext, Session } from "@/lib/types";
import { Captions, type Caption } from "./Captions";
import { MemoryPeek } from "./MemoryPeek";
import { NextTimeCard } from "./NextTimeCard";
import { StatusOrb, type OrbState } from "./StatusOrb";
import { TextFallback } from "./TextFallback";
import { nickname } from "@/components/book/citations";
import { createTurnQueue, mapRole, type TurnQueue } from "./turnQueue";

const NO_AUDIO_TIMEOUT_MS = 8000;
const FINALIZE_TIMEOUT_MS = 40000;

type Phase = "idle" | "starting" | "live" | "finalizing" | "done" | "finalizeFailed";

export function Talk({ warm = false }: { warm?: boolean }) {
  return (
    <ConversationProvider>
      <TalkInner warm={warm} />
    </ConversationProvider>
  );
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

function TalkInner({ warm }: { warm: boolean }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [memory, setMemory] = useState<MemoryContext | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [nextTopic, setNextTopic] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const queueRef = useRef<TurnQueue | null>(null);
  const finalizedRef = useRef(false);
  const suppressDisconnectRef = useRef(false); // true when we end voice to switch to text
  const gotAudioRef = useRef(false);
  const noAudioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef(mode);
  const phaseRef = useRef(phase);
  useEffect(() => {
    modeRef.current = mode;
    phaseRef.current = phase;
  }, [mode, phase]);

  const addCaption = useCallback((c: Caption) => setCaptions((prev) => [...prev.slice(-9), c]), []);

  const clearNoAudioTimer = () => {
    if (noAudioTimerRef.current) clearTimeout(noAudioTimerRef.current);
    noAudioTimerRef.current = null;
  };

  // Load memory for greeting + MemoryPeek.
  useEffect(() => {
    api.memory().then((r) => setMemory((m) => m ?? r.memory)).catch(() => {});
  }, []);

  const newQueue = (sessionId: string) =>
    createTurnQueue({
      send: (t) => api.addTurn(sessionId, t),
      onError: (t, err) => console.error("[talk] turn not saved", t.clientSeq, err),
    });

  // ---------- finalize (exactly once) ----------
  const finalize = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || finalizedRef.current) return;
    finalizedRef.current = true;
    clearNoAudioTimer();
    setPhase("finalizing");
    try {
      await queueRef.current?.flush();
      const res = await withTimeout(api.finalize(session.id), FINALIZE_TIMEOUT_MS);
      setNextTopic(res.nextTopic);
      setPhase("done");
    } catch (e) {
      console.error("[talk] finalize failed", e);
      setPhase("finalizeFailed");
    }
  }, []);

  // ---------- text fallback ----------
  const playTts = useCallback(async (text: string) => {
    try {
      const blob = await api.tts(text);
      const url = URL.createObjectURL(blob);
      audioRef.current?.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      /* text only */
    }
  }, []);

  const sendChat = useCallback(
    async (text: string) => {
      const session = sessionRef.current;
      if (!session) return;
      setChatBusy(true);
      if (text) addCaption({ role: "grandparent", text });
      try {
        await queueRef.current?.flush();
        const seq = queueRef.current?.reserveSeq() ?? 0;
        const res = await api.chat(session.id, text, seq);
        queueRef.current?.reserveSeq(); // reply turn also consumed a seq server-side
        addCaption({ role: "ai", text: res.reply });
        void playTts(res.reply);
      } catch (e) {
        console.error("[talk] chat failed", e);
        setError("Couldn’t send that. Please try again.");
      } finally {
        setChatBusy(false);
      }
    },
    [addCaption, playTts],
  );

  const switchToText = useCallback(
    async (reason: string) => {
      if (modeRef.current === "text" || finalizedRef.current) return;
      clearNoAudioTimer();
      modeRef.current = "text";
      setMode("text");
      setFallbackReason(reason);
      suppressDisconnectRef.current = true;
      try {
        conversationRef.current?.endSession();
      } catch {
        /* ignore */
      }
      try {
        if (!sessionRef.current) {
          const r = await api.startSession("text");
          sessionRef.current = r.session;
          queueRef.current = newQueue(r.session.id);
          setMemory(r.memory);
        }
        phaseRef.current = "live";
        setPhase("live");
        await queueRef.current?.flush();
        if ((queueRef.current?.sent.length ?? 0) === 0) await sendChat("");
      } catch (e) {
        console.error("[talk] text fallback start failed", e);
        setError("Couldn’t start the conversation. Please refresh the page.");
        setPhase("idle");
      }
    },
    [sendChat],
  );

  // ---------- voice ----------
  const conversation = useConversation({
    onConnect: ({ conversationId }) => {
      const s = sessionRef.current;
      if (s && conversationId) api.setConversationId(s.id, conversationId).catch(() => {});
      phaseRef.current = "live";
      setPhase("live");
    },
    onMessage: ({ message, role, event_id }) => {
      if (modeRef.current !== "voice") return;
      const r = mapRole(role);
      if (r === "ai") {
        gotAudioRef.current = true;
        clearNoAudioTimer();
      }
      const seq = queueRef.current?.enqueue(r, message, event_id !== undefined ? `${role}:${event_id}` : undefined);
      if (seq != null) addCaption({ role: r, text: message.trim() });
    },
    onModeChange: ({ mode: m }) => {
      if (m === "speaking") {
        gotAudioRef.current = true;
        clearNoAudioTimer();
      }
    },
    onError: (message) => {
      console.error("[talk] EL error", message);
      if (!gotAudioRef.current) void switchToText("Voice isn’t working right now — we can type instead.");
    },
    onDisconnect: (details) => {
      if (suppressDisconnectRef.current || modeRef.current !== "voice") return;
      if (details.reason === "error" && !gotAudioRef.current) {
        void switchToText("Voice isn’t working right now — we can type instead.");
        return;
      }
      if (phaseRef.current === "live" || phaseRef.current === "starting") void finalize();
    },
  });
  const conversationRef = useRef(conversation);
  useEffect(() => {
    // Ref is read only from event handlers (switchToText/stop), never during render.
    // eslint-disable-next-line react-hooks/immutability
    conversationRef.current = conversation;
  }, [conversation]);

  const startVoice = useCallback(async () => {
    if (phaseRef.current !== "idle") return;
    setError(null);
    setCaptions([]);
    finalizedRef.current = false;
    suppressDisconnectRef.current = false;
    gotAudioRef.current = false;
    modeRef.current = "voice";
    setMode("voice");
    phaseRef.current = "starting";
    setPhase("starting");

    let micOk = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      micOk = false;
    }

    let r;
    try {
      r = await api.startSession("voice");
    } catch (e) {
      console.error("[talk] start session failed", e);
      setError("Couldn’t start the conversation. Please try again.");
      setPhase("idle");
      return;
    }
    sessionRef.current = r.session;
    queueRef.current = newQueue(r.session.id);
    setMemory(r.memory);

    if (!micOk) return void switchToText("The microphone isn’t available — we can type instead.");
    if (!r.conversationToken) return void switchToText("Voice isn’t available right now — we can type instead.");

    try {
      conversationRef.current.startSession({
        conversationToken: r.conversationToken,
        connectionType: "webrtc",
        dynamicVariables: r.dynamicVariables,
      });
    } catch (e) {
      console.error("[talk] startSession threw", e);
      return void switchToText("Voice isn’t working right now — we can type instead.");
    }
    noAudioTimerRef.current = setTimeout(() => {
      if (!gotAudioRef.current) void switchToText("I can’t hear Tom right now, so let’s type for a bit.");
    }, NO_AUDIO_TIMEOUT_MS);
  }, [switchToText]);

  const stop = useCallback(async () => {
    suppressDisconnectRef.current = true; // we finalize ourselves
    clearNoAudioTimer();
    try {
      if (conversationRef.current.status !== "disconnected") conversationRef.current.endSession();
    } catch {
      /* ignore */
    }
    audioRef.current?.pause();
    await finalize();
  }, [finalize]);

  const loadPrepared = useCallback(async () => {
    try {
      await api.loadDemo("after-s2");
      const m = await api.memory();
      setMemory(m.memory);
      setNextTopic(m.memory.nextTopic);
      setPhase("done");
    } catch {
      setError("Couldn’t load the prepared result either.");
    }
  }, []);

  const restart = useCallback(() => {
    sessionRef.current = null;
    queueRef.current = null;
    finalizedRef.current = false;
    setCaptions([]);
    setNextTopic("");
    setFallbackReason(null);
    setMode("voice");
    modeRef.current = "voice";
    setPhase("idle");
    phaseRef.current = "idle";
    api.memory().then((r) => setMemory(r.memory)).catch(() => {});
  }, []);

  // ?warm=1 → connect immediately.
  const warmedRef = useRef(false);
  useEffect(() => {
    if (warm && !warmedRef.current) {
      warmedRef.current = true;
      void startVoice();
    }
  }, [warm, startVoice]);

  useEffect(() => () => clearNoAudioTimer(), []);

  // ---------- render ----------
  const grandparent = nickname(memory?.grandparentName, "Jarda");
  const grandchild = nickname(memory?.grandchildName, "Tom");
  const orb: OrbState =
    phase === "starting" || conversation.status === "connecting"
      ? "connecting"
      : mode === "text"
        ? chatBusy ? "thinking" : "idle"
        : conversation.status === "connected"
          ? conversation.isSpeaking ? "speaking" : "listening"
          : "idle";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center gap-8 px-5 py-10">
      <h1 className="text-center font-serif text-5xl tracking-tight text-ink">Hi, Grandpa {grandparent}</h1>

      {error && <p className="rounded-xl bg-warn-soft px-5 py-3 text-xl text-ink">{error}</p>}

      {phase === "idle" && (
        <>
          <button
            onClick={() => void startVoice()}
            className="flex aspect-square w-[min(80vw,45vh)] min-w-56 items-center justify-center rounded-full bg-brick text-[40px] font-semibold text-white shadow-xl transition-transform hover:scale-[1.02] hover:bg-brick-dark active:scale-95"
          >
            Talk
          </button>
          <p className="text-center text-2xl text-ink-soft">Press the button and have a chat with {grandchild}.</p>
        </>
      )}

      {(phase === "starting" || phase === "live") && (
        <>
          <StatusOrb state={orb} speakerName={grandchild} />
          <Captions items={captions} aiName={grandchild} />
          {mode === "text" && (
            <TextFallback onSend={sendChat} busy={chatBusy} reason={fallbackReason} />
          )}
          <button
            onClick={() => void stop()}
            className="rounded-2xl border-2 border-brick bg-card px-10 py-5 text-3xl font-semibold text-brick hover:bg-paper-dark"
          >
            End
          </button>
          {mode === "voice" && (
            <button
              onClick={() => void switchToText("")}
              className="text-lg text-ink-soft underline underline-offset-4"
            >
              Type instead
            </button>
          )}
        </>
      )}

      {phase === "finalizing" && (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-brick" />
          <p className="text-3xl text-ink">Thank you, Grandpa. Writing down your memories…</p>
        </div>
      )}

      {phase === "finalizeFailed" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-2xl text-ink">Writing it down is taking longer than it should.</p>
          <button
            onClick={() => void loadPrepared()}
            className="rounded-2xl bg-brick px-8 py-4 text-2xl font-medium text-white hover:bg-brick-dark"
          >
            Load the prepared result
          </button>
        </div>
      )}

      {phase === "done" && <NextTimeCard nextTopic={nextTopic || memory?.nextTopic || "…"} onRestart={restart} />}

      <MemoryPeek memory={memory} />
    </main>
  );
}
