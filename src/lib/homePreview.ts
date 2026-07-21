// Picks which creations/patterns the home page's preview cards show, in
// priority order: recently-uploaded items first (same "New" window as the
// badge — see newBadge.ts), then a hand-picked highlight list, then the
// collection's own default order (most recent first) to fill any remaining
// slots. Each tier is skipped once `limit` items are picked, and an item
// already picked by an earlier tier is never picked twice.
import { isRecentlyUploaded } from "./newBadge";

export function buildHomePreview<T>(
  items: T[],
  getId: (item: T) => string,
  getUploadDate: (item: T) => Date | undefined,
  highlightedIds: string[],
  limit: number
): T[] {
  const byId = new Map(items.map((item) => [getId(item), item]));
  const picked: T[] = [];
  const pickedIds = new Set<string>();

  function take(item: T) {
    const id = getId(item);
    if (pickedIds.has(id)) return;
    pickedIds.add(id);
    picked.push(item);
  }

  for (const item of items) {
    if (picked.length >= limit) break;
    if (isRecentlyUploaded(getUploadDate(item))) take(item);
  }

  for (const id of highlightedIds) {
    if (picked.length >= limit) break;
    const item = byId.get(id);
    if (item) take(item);
  }

  for (const item of items) {
    if (picked.length >= limit) break;
    take(item);
  }

  return picked;
}
