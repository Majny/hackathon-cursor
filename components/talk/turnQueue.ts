// Serial turn queue: assigns a monotonic clientSeq and POSTs turns one at a time, in order.
// Pure (no React, no fetch) so it is unit-testable; the sender is injected.
import type { Turn } from "@/lib/types";

export interface QueuedTurn {
  role: Turn["role"];
  text: string;
  clientSeq: number;
}

export interface TurnQueueOptions {
  send: (turn: QueuedTurn) => Promise<unknown>;
  retries?: number; // extra attempts per turn (default 2)
  retryDelayMs?: number;
  onError?: (turn: QueuedTurn, err: unknown) => void;
  startSeq?: number;
}

export interface TurnQueue {
  /** Enqueue a turn. `key` (e.g. EL event_id) dedupes repeated deliveries. Returns clientSeq or null if duplicate/empty. */
  enqueue: (role: Turn["role"], text: string, key?: string | number) => number | null;
  /** Reserve a clientSeq for a turn sent by another path (e.g. /api/chat). */
  reserveSeq: () => number;
  /** Resolves when all queued turns have been sent (or failed). */
  flush: () => Promise<void>;
  readonly sent: QueuedTurn[];
}

export function mapRole(role: string): Turn["role"] {
  return role === "user" ? "grandparent" : "ai";
}

export function createTurnQueue(opts: TurnQueueOptions): TurnQueue {
  const retries = opts.retries ?? 2;
  const retryDelayMs = opts.retryDelayMs ?? 300;
  let seq = opts.startSeq ?? 0;
  let chain: Promise<void> = Promise.resolve();
  const seenKeys = new Set<string>();
  const sentSeqs = new Set<number>();
  const sent: QueuedTurn[] = [];

  async function deliver(turn: QueuedTurn) {
    if (sentSeqs.has(turn.clientSeq)) return;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await opts.send(turn);
        sentSeqs.add(turn.clientSeq);
        sent.push(turn);
        return;
      } catch (err) {
        if (attempt === retries) {
          opts.onError?.(turn, err);
          return;
        }
        if (retryDelayMs > 0) await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
      }
    }
  }

  return {
    enqueue(role, text, key) {
      const clean = text.trim();
      if (!clean) return null;
      if (key !== undefined && key !== null) {
        const k = String(key);
        if (seenKeys.has(k)) return null;
        seenKeys.add(k);
      }
      const turn: QueuedTurn = { role, text: clean, clientSeq: ++seq };
      chain = chain.then(() => deliver(turn));
      return turn.clientSeq;
    },
    reserveSeq() {
      return ++seq;
    },
    flush() {
      return chain;
    },
    get sent() {
      return sent;
    },
  };
}
