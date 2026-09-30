import { getDb } from "@/lib/store";
import { buildGedcom } from "@/lib/gedcom";
import { resolveTree } from "@/lib/treeLayout";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const includeUnmatched = url.searchParams.get("includeUnmatched") === "1";
    const db = await getDb();
    const ged = buildGedcom({ ...db, tree: resolveTree(db.tree) }, { includeUnmatched });
    return new Response(ged, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="novak-family-tree.ged"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
