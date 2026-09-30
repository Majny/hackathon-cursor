import { NextResponse } from "next/server";
import { getFakeTree, toGedcom } from "@/lib/match";
import { readStore, writeStore } from "@/lib/store";

export async function POST(req: Request) {
  const body = await req.json();
  const { entityId, treePersonId, decision } = body as {
    entityId: string;
    treePersonId: string;
    decision: "confirmed" | "rejected";
  };

  const store = await readStore();
  const match = store.matches.find(
    (m) => m.entityId === entityId && m.treePersonId === treePersonId
  );
  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }
  match.status = decision;
  await writeStore(store);
  return NextResponse.json(store);
}

export async function GET() {
  const store = await readStore();
  const tree = getFakeTree();
  const confirmed = store.matches
    .filter((m) => m.status === "confirmed")
    .map((m) => {
      const entity = store.entities.find((e) => e.id === m.entityId)!;
      const person = tree.find((t) => t.id === m.treePersonId)!;
      return { entity, person };
    })
    .filter((x) => x.entity && x.person);

  const gedcom = toGedcom({
    subjectName: "Grandparent Demo",
    chapterBody: store.chapter?.body || "",
    confirmed,
  });

  return new NextResponse(gedcom, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="and-then-export.ged"',
    },
  });
}
