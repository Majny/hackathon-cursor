import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/store";
import { suggestMatches } from "@/lib/matching/match";
import { resolveTree } from "@/lib/treeLayout";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(db.matches);
}

export async function POST() {
  try {
    const matches = await updateDb((db) => {
      db.tree = resolveTree(db.tree);
      // exclude grandparent (I1) and grandchild persona (I10)
      const grandchild = db.tree.persons.find(
        (p) => p.givenName === db.grandparent.grandchildName && p.id !== db.grandparent.treePersonId,
      );
      const exclude = [db.grandparent.treePersonId, ...(grandchild ? [grandchild.id] : [])];
      db.matches = suggestMatches(db.persons, db.tree, exclude, db.matches);
      return db.matches;
    });
    return NextResponse.json(matches);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
