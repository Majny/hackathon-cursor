# Contract requests

Append-only. Format: `- [WPx] file: requested change – reason (local workaround: ...)`


- **WP3 → WP0/WP5:** `data/snapshots/empty.json` still has the 3-person placeholder tree. Please embed `data/fake-tree.json` there too. WP3 works around it: `resolveTree()` in `lib/treeLayout.ts` swaps a placeholder/partial tree for the full one in `/api/tree`, `/api/export/gedcom`, `/rodina/strom` and `/rodina/lide`, and `POST /api/matches` writes the full tree into the db.
- **WP3 info:** match ids are `m-${entityId}-${treePersonId.toLowerCase()}` (e.g. `m-pepa-i6`, same as the snapshots).
