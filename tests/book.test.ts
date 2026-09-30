import { describe, expect, it } from "vitest";
import { chapterStats, formatCzDate, numberCitations, sessionIdFromTurnId, transcriptHref } from "@/components/book/citations";

describe("book citations", () => {
  it("derives session id from turn id", () => {
    expect(sessionIdFromTurnId("s1-t07")).toBe("s1");
    expect(sessionIdFromTurnId("s12-t103")).toBe("s12");
    expect(sessionIdFromTurnId("garbage")).toBeNull();
  });

  it("builds transcript links", () => {
    expect(transcriptHref("s1-t07")).toBe("/family/sessions/s1#s1-t07");
    expect(transcriptHref("x", "s2")).toBe("/family/sessions/s2#x");
  });

  it("numbers citations by first appearance, stable across paragraphs", () => {
    const res = numberCitations([
      { citations: [{ turnId: "s1-t01", quote: "a" }, { turnId: "s1-t03", quote: "b" }] },
      { citations: [{ turnId: "s1-t05", quote: "c" }, { turnId: "s1-t01", quote: "a" }] },
      { citations: [] },
      { citations: [{ turnId: "s2-t02", quote: "d" }, { turnId: "s2-t02", quote: "d" }] },
    ]);
    expect(res.map((p) => p.map((c) => c.n))).toEqual([[1, 2], [3, 1], [], [4]]);
    expect(res[3][0].href).toBe("/family/sessions/s2#s2-t02");
    expect(res[3][0].sessionId).toBe("s2");
  });

  it("prefers explicit turn->session mapping", () => {
    const res = numberCitations([{ citations: [{ turnId: "weird", quote: "q" }] }], { weird: "s3" });
    expect(res[0][0].href).toBe("/family/sessions/s3#weird");
  });

  it("computes stats and dates", () => {
    const p = { id: "p", text: "", citations: [], warnings: [] };
    expect(chapterStats({ paragraphs: [
      { ...p, verified: true, editedByFamily: false },
      { ...p, verified: false, editedByFamily: true },
    ] })).toEqual({ total: 2, unverified: 1, edited: 1 });
    expect(formatCzDate("2026-09-30T10:00:00")).toBe("30. 9. 2026");
    expect(formatCzDate(null)).toBe("");
  });
});

import { bookTitle } from "@/components/book/citations";
describe("bookTitle", () => {
  it("builds genitive title", () => {
    expect(bookTitle({ fullName: "Jaroslav Novák", sex: "M" })).toBe("Vzpomínky dědy Jaroslava");
    expect(bookTitle({ fullName: "Marta Nováková", sex: "F" })).toBe("Vzpomínky babičky Marty");
    expect(bookTitle(null)).toBe("Vzpomínky dědy Jaroslava");
  });
});
