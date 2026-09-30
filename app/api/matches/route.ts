import { NextResponse } from "next/server";
import { getDb, updateDb } from "@/lib/store";
import { suggestMatches } from "@/lib/matching/match";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  return NextResponse.json(db.matches);
}

export async function POST() {
  const matches = await updateDb((db) => {
    // exclude grandparent (I1) and grandchild persona (I10 in the full tree)
    const grandchild = db.tree.persons.find(
      (p) => p.givenName === db.grandparent.grandchildName && p.id !== db.grandparent.treePersonId,
    );
    const exclude = [db.grandparent.treePersonId, ...(grandchild ? [grandchild.id] : [])];
    db.matches = suggestMatches(db.persons, db.tree, exclude, db.matches);
    return db.matches;
  });
  return NextResponse.json(matches);
}
