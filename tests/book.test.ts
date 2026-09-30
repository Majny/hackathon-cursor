import { describe, expect, it } from "vitest";
import { chapterStats, formatDate, formatTime, nickname, numberCitations, sessionIdFromTurnId, transcriptHref } from "@/components/book/citations";

describe("book citations", () => {
  it("derives session id from turn id", () => {
    expect(sessionIdFromTurnId("s1-t07")).toBe("s1");
    expect(sessionIdFromTurnId("s12-t103")).toBe("s12");
    expect(sessionIdFromTurnId("garbage")).toBeNull();
  });

  it("builds transcript links", () => {
    expect(transcriptHref("s1-t07")).toBe("/family/conversations/s1#s1-t07");
    expect(transcriptHref("x", "s2")).toBe("/family/conversations/s2#x");
  });

  it("numbers citations by first appearance, stable across paragraphs", () => {
    const res = numberCitations([
      { citations: [{ turnId: "s1-t01", quote: "a" }, { turnId: "s1-t03", quote: "b" }] },
      { citations: [{ turnId: "s1-t05", quote: "c" }, { turnId: "s1-t01", quote: "a" }] },
      { citations: [] },
      { citations: [{ turnId: "s2-t02", quote: "d" }, { turnId: "s2-t02", quote: "d" }] },
    ]);
    expect(res.map((p) => p.map((c) => c.n))).toEqual([[1, 2], [3, 1], [], [4]]);
    expect(res[3][0].href).toBe("/family/conversations/s2#s2-t02");
    expect(res[3][0].sessionId).toBe("s2");
  });

  it("prefers explicit turn->session mapping", () => {
    const res = numberCitations([{ citations: [{ turnId: "weird", quote: "q" }] }], { weird: "s3" });
    expect(res[0][0].href).toBe("/family/conversations/s3#weird");
  });

  it("computes stats and dates", () => {
    const p = { id: "p", text: "", citations: [], warnings: [] };
    expect(chapterStats({ paragraphs: [
      { ...p, verified: true, editedByFamily: false },
      { ...p, verified: false, editedByFamily: true },
    ] })).toEqual({ total: 2, unverified: 1, edited: 1 });
    expect(formatDate("2026-09-30T10:00:00")).toBe("30 Sep 2026");
    expect(formatDate(null)).toBe("");
    expect(formatTime("2026-09-30T09:05:00")).toBe("09:05");
    expect(nickname("Jerry Miller")).toBe("Jerry");
    expect(nickname("Tomáš")).toBe("Tom");
    expect(nickname("", "Grandpa")).toBe("Grandpa");
  });
});

import { bookTitle } from "@/components/book/citations";
describe("bookTitle", () => {
  it("builds English possessive title", () => {
    expect(bookTitle({ fullName: "Jerry Miller", sex: "M" })).toBe("Grandpa Jerry's Memories");
    expect(bookTitle({ fullName: "Marta Miller", sex: "F" })).toBe("Grandma Marta's Memories");
    expect(bookTitle(null)).toBe("Grandpa Jerry's Memories");
  });
});

import { readFileSync } from "fs";
import path from "path";
import type { Db } from "@/lib/types";
import { getChapterView, getTimeline } from "@/lib/archive";
import { decadeOf, groupByDecade } from "@/components/archive/timeline/LifeTimeline";

const snap = JSON.parse(readFileSync(path.join(process.cwd(), "data/snapshots/after-s2.json"), "utf8")) as Db;

describe("stories + timeline wiring", () => {
  it("chapter citations point at conversations with turn anchors", () => {
    const v = getChapterView(snap, snap.chapters[0]);
    const all = v.paragraphs.flatMap((p) => p.numbered);
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) expect(c.href).toMatch(/^\/family\/conversations\/s\d+#s\d+-t\d+$/);
  });

  it("groups the timeline by decade and collapses quiet decades", () => {
    const t = getTimeline(snap);
    expect(decadeOf(1946)).toBe(1940);
    const blocks = groupByDecade(t.items, t.birthYear, t.nowYear);
    expect(blocks[0]).toMatchObject({ kind: "decade", decade: 1940 });
    expect(blocks.at(-1)).toMatchObject({ kind: "decade", decade: 2020 });
    // no two gaps in a row
    for (let i = 1; i < blocks.length; i++) expect(blocks[i].kind === "gap" && blocks[i - 1].kind === "gap").toBe(false);
    const counted = blocks.reduce((n, b) => n + (b.kind === "decade" ? b.items.length : 0), 0);
    expect(counted).toBe(t.items.length);
  });
});
