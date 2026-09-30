import { NextResponse } from "next/server";
import { updateDb } from "@/lib/store";
import { llmStructured } from "@/lib/llm";
import { ChapterSchema } from "@/lib/schemas";
import { isLifeTopicKey } from "@/lib/topics";
import { newId, nowIso } from "@/lib/ids";
import type { Chapter, Citation } from "@/lib/types";

export const dynamic = "force-dynamic";

// STUB by WP0 – WP2 replaces with generateChapter() + validateCitations().
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { key?: string };
  const key = body.key;
  if (!isLifeTopicKey(key)) return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  try {
    const { data, model } = await llmStructured({ task: "chapter", schema: ChapterSchema, system: "", user: "", writer: true });
    const chapter = await updateDb((db) => {
      const byId = new Map(db.turns.map((t) => [t.id, t]));
      const ch: Chapter = {
        id: newId("ch"), key, title: data.title,
        paragraphs: data.paragraphs.map((p) => {
          const citations: Citation[] = [];
          for (const cid of p.citations) {
            const t = byId.get(cid);
            if (t && t.role === "grandparent") citations.push({ turnId: t.id, quote: t.text.slice(0, 160) });
          }
          return { id: newId("p"), text: p.text, citations, verified: citations.length > 0, warnings: [], editedByFamily: false };
        }),
        openQuestions: data.openQuestions, status: "draft", generatedAt: nowIso(), model,
      };
      db.chapters = db.chapters.filter((c) => c.key !== key).concat(ch);
      return ch;
    });
    return NextResponse.json(chapter);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
