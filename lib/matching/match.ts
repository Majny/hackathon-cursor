// STUB by WP0 – owned and implemented by WP3 (see docs/PLAN.md §9).
import type { FamilyTree, Match, PersonEntity } from "../types";

/**
 * Suggest top-1 tree matches for extracted persons.
 * Confirmed/rejected matches from `previous` must be preserved.
 */
export function suggestMatches(
  persons: PersonEntity[],
  tree: FamilyTree,
  exclude: string[],
  previous: Match[],
): Match[] {
  void persons; void tree; void exclude;
  // Stub: no new suggestions, but keep human decisions (confirmed/rejected).
  return previous.filter((m) => m.status !== "suggested");
}
