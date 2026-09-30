import { describe, expect, it } from "vitest";
import { createTurnQueue, mapRole, type QueuedTurn } from "@/components/talk/turnQueue";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("turn queue", () => {
  it("sends serially in clientSeq order even when sends take varying time", async () => {
    const received: QueuedTurn[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const q = createTurnQueue({
      send: async (t) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await sleep(t.clientSeq % 2 ? 15 : 1);
        received.push(t);
        inFlight--;
      },
    });
    q.enqueue("ai", "Hi Grandpa");
    q.enqueue("grandparent", "Hi Tom");
    q.enqueue("ai", "Where did you grow up?");
    q.enqueue("grandparent", "In Kladno.");
    await q.flush();
    expect(maxInFlight).toBe(1);
    expect(received.map((t) => t.clientSeq)).toEqual([1, 2, 3, 4]);
    expect(received.map((t) => t.role)).toEqual(["ai", "grandparent", "ai", "grandparent"]);
  });

  it("dedupes repeated deliveries by key, but not identical text", async () => {
    const received: QueuedTurn[] = [];
    const q = createTurnQueue({ send: async (t) => void received.push(t) });
    expect(q.enqueue("grandparent", "Yes.", 10)).toBe(1);
    expect(q.enqueue("grandparent", "Yes.", 10)).toBeNull();
    expect(q.enqueue("grandparent", "Yes.", 11)).toBe(2);
    expect(q.enqueue("ai", "   ")).toBeNull();
    await q.flush();
    expect(received.map((t) => t.clientSeq)).toEqual([1, 2]);
    expect(new Set(received.map((t) => t.clientSeq)).size).toBe(received.length);
  });

  it("retries a failed send without duplicating, and a permanent failure doesn't block later turns", async () => {
    const attempts: number[] = [];
    const errors: number[] = [];
    let failFirst = true;
    const q = createTurnQueue({
      retryDelayMs: 0,
      retries: 1,
      send: async (t) => {
        attempts.push(t.clientSeq);
        if (t.clientSeq === 1 && failFirst) {
          failFirst = false;
          throw new Error("network");
        }
        if (t.clientSeq === 2) throw new Error("server down");
      },
      onError: (t) => errors.push(t.clientSeq),
    });
    q.enqueue("ai", "a");
    q.enqueue("grandparent", "b");
    q.enqueue("ai", "c");
    await q.flush();
    expect(attempts).toEqual([1, 1, 2, 2, 3]);
    expect(errors).toEqual([2]);
    expect(q.sent.map((t) => t.clientSeq)).toEqual([1, 3]);
  });

  it("reserveSeq shares the counter with enqueue", async () => {
    const q = createTurnQueue({ send: async () => {} });
    expect(q.reserveSeq()).toBe(1);
    expect(q.enqueue("ai", "x")).toBe(2);
    expect(q.reserveSeq()).toBe(3);
  });

  it("maps EL roles", () => {
    expect(mapRole("user")).toBe("grandparent");
    expect(mapRole("agent")).toBe("ai");
    expect(mapRole("ai")).toBe("ai");
  });
});
