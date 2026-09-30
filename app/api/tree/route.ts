import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import type { Citation, PersonEntity } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const confirmedByTreeId: Record<string, { entity: PersonEntity; citations: Citation[] }> = {};
  const turns = new Map(db.turns.map((t) => [t.id, t]));
  for (const m of db.matches.filter((x) => x.status === "confirmed")) {
    const entity = db.persons.find((p) => p.id === m.entityId);
    if (!entity) continue;
    const citations: Citation[] = [];
    for (const tid of entity.turnIds) {
      const t = turns.get(tid);
      if (t) citations.push({ turnId: t.id, quote: t.text.slice(0, 160) });
    }
    confirmedByTreeId[m.treePersonId] = { entity, citations };
  }
  return NextResponse.json({ tree: db.tree, matches: db.matches, confirmedByTreeId });
}
