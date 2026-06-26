import type { SvelteComponent } from "svelte";
import type { IndexItem } from "../indexing/types";

export interface DynamicContentItem {
  id: string;
  text: string;
  category: string;
  content: string;
  dateAdded: number;
  metadata: Record<string, any>;
  actionId: string;
  renderComponentId: string;
  renderComponent?: typeof SvelteComponent;
}

let dynamicItems: IndexItem[] = [];

/**
 * Loads a new set of dynamic items (full replace).
 */
export function loadDynamicItems(items: IndexItem[]) {
  dynamicItems = items;
}

/**
 * Merge changed items and remove deleted ids without reloading the full corpus.
 */
export function mergeDynamicItems(
  changedItems: IndexItem[],
  removedIds: string[] = [],
): void {
  if (changedItems.length === 0 && removedIds.length === 0) return;

  const removeSet = new Set(removedIds);
  const changeMap = new Map(changedItems.map((item) => [item.id, item]));
  const kept = dynamicItems.filter(
    (item) => !removeSet.has(item.id) && !changeMap.has(item.id),
  );
  dynamicItems = [...kept, ...changedItems];
}

/**
 * Returns all currently loaded dynamic items.
 */
export function getDynamicItems(): IndexItem[] {
  return dynamicItems;
}
