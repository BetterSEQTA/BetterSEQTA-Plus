import type { SvelteComponent } from 'svelte';
import type { HydratedIndexItem } from './indexing/types';

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

let dynamicItems: HydratedIndexItem[] = [];

/**
 * Loads a new set of dynamic items.
 */
export function loadDynamicItems(items: HydratedIndexItem[]) {
  dynamicItems = items;
}

/**
 * Returns all currently loaded dynamic items.
 */
export function getDynamicItems(): HydratedIndexItem[] {
  return dynamicItems;
}