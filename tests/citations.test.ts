import { describe, expect, it } from "vitest";
import { validateCitations, properNames } from "@/lib/chapters";
import type { Turn } from "@/lib/types";

const t = (id: string, role: Turn["role"], text: string): Turn => ({ id, sessionId: "s1", idx: 0, clientSeq: 0, role, text, at: "" });
const turns = [
  t("s1-t01", "grandparent", "Narodil jsem se na Kladně v roce 1946 a táta dělal v huti Poldi."),
  t("s1-t02", "ai", "A kdo byl Pepa? Bylo to v roce 1957?"),
  t("s1-t13", "grandparent", "Pepa Dvořák bydlel o dům vedle a byl o dva roky mladší."),
];

describe("validateCitations", () => {
  it("drops unknown ids and AI turns, fills quote", () => {
    const [p] = validateCitations({ title: "x", openQuestions: [], paragraphs: [
      { text: "Narodil jsem se na Kladně.", citations: ["s1-t01", "s1-t02", "s9-t99"] },
    ] }, turns);
    expect(p.citations.map((c) => c.turnId)).toEqual(["s1-t01"]);
    expect(p.citations[0].quote).toBe(turns[0].text.slice(0, 160));
    expect(p.verified).toBe(true);
    expect(p.warnings).toEqual([]);
  });

  it("no valid citation -> verified false", () => {
    const [p] = validateCitations({ title: "x", openQuestions: [], paragraphs: [{ text: "Něco.", citations: ["s1-t02"] }] }, turns);
    expect(p.citations).toEqual([]);
    expect(p.verified).toBe(false);
    expect(p.warnings.length).toBeGreaterThan(0);
  });

  it("year not in cited turns -> warning (even if AI said it)", () => {
    const [p] = validateCitations({ title: "x", openQuestions: [], paragraphs: [
      { text: "V roce 1957 jsem s Pepou utekl.", citations: ["s1-t13"] },
    ] }, turns);
    expect(p.verified).toBe(false);
    expect(p.warnings.join(" ")).toContain("1957");
  });

  it("declined names pass, invented names fail", () => {
    const [ok, bad] = validateCitations({ title: "x", openQuestions: [], paragraphs: [
      { text: "Nejvíc jsem byl s Pepou Dvořákem, na Kladně jsme vyrůstali.", citations: ["s1-t13", "s1-t01"] },
      { text: "Nejvíc jsem byl s Karlem Zemanem.", citations: ["s1-t13"] },
    ] }, turns);
    expect(ok.warnings).toEqual([]);
    expect(ok.verified).toBe(true);
    expect(bad.verified).toBe(false);
    expect(bad.warnings.join(" ")).toContain("Karlem");
  });

  it("sentence-initial and quoted words are not names", () => {
    expect(properNames("Narodil jsem se. Pak přišel „To byla vůně,“ řekl Pepa.")).toEqual(["Pepa"]);
  });
});
