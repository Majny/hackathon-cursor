import { describe, expect, it } from "vitest";
import { validateCitations, properNames } from "@/lib/chapters";
import type { Turn } from "@/lib/types";

const t = (id: string, role: Turn["role"], text: string): Turn => ({ id, sessionId: "s1", idx: 0, clientSeq: 0, role, text, at: "" });
const turns = [
  t("s1-t01", "grandparent", "I was born in Kladno in 1946 and my dad worked at the Poldi steelworks."),
  t("s1-t02", "ai", "And who was Pepa? Was that in 1957?"),
  t("s1-t13", "grandparent", "Pepa Walker lived next door and was two years younger than me."),
];

describe("validateCitations", () => {
  it("drops unknown ids and AI turns, fills quote", () => {
    const [p] = validateCitations({ title: "x", openQuestions: [], paragraphs: [
      { text: "I was born in Kladno.", citations: ["s1-t01", "s1-t02", "s9-t99"] },
    ] }, turns);
    expect(p.citations.map((c) => c.turnId)).toEqual(["s1-t01"]);
    expect(p.citations[0].quote).toBe(turns[0].text.slice(0, 160));
    expect(p.verified).toBe(true);
    expect(p.warnings).toEqual([]);
  });

  it("no valid citation -> verified false", () => {
    const [p] = validateCitations({ title: "x", openQuestions: [], paragraphs: [{ text: "Something.", citations: ["s1-t02"] }] }, turns);
    expect(p.citations).toEqual([]);
    expect(p.verified).toBe(false);
    expect(p.warnings.length).toBeGreaterThan(0);
  });

  it("year not in cited turns -> warning (even if AI said it)", () => {
    const [p] = validateCitations({ title: "x", openQuestions: [], paragraphs: [
      { text: "In 1957 I ran off with Pepa.", citations: ["s1-t13"] },
    ] }, turns);
    expect(p.verified).toBe(false);
    expect(p.warnings.join(" ")).toContain("1957");
  });

  it("grounded names pass (incl. possessive), invented names fail", () => {
    const [ok, bad] = validateCitations({ title: "x", openQuestions: [], paragraphs: [
      { text: "Mostly I was with Pepa Walker, and I grew up with Pepa's gang in Kladno.", citations: ["s1-t13", "s1-t01"] },
      { text: "Mostly I was with Charles Zeman.", citations: ["s1-t13"] },
    ] }, turns);
    expect(ok.warnings).toEqual([]);
    expect(ok.verified).toBe(true);
    expect(bad.verified).toBe(false);
    expect(bad.warnings.join(" ")).toContain("Charles");
  });

  it("sentence-initial and quoted words are not names", () => {
    expect(properNames("I was born. Then I said “That smell,” and Pepa laughed.")).toEqual(["Pepa"]);
  });
});
