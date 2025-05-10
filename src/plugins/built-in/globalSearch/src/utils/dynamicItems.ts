import type { SvelteComponent } from "svelte"; // Imports the SvelteComponent type for component typing
import type { IndexItem } from "./indexing/types"; // Imports the IndexItem type from the specified path

// Defines the structure for a dynamic content item
export interface DynamicContentItem {
  id: string; // Unique identifier for the content item
  text: string; // Text content for the item
  category: string; // Category to which the item belongs
  content: string; // Main content or body of the item
  dateAdded: number; // Timestamp representing when the item was added
  metadata: Record<string, any>; // Additional metadata associated with the item
  actionId: string; // Identifier for the action related to the content item
  renderComponentId: string; // Identifier for the render component associated with the item
  renderComponent?: typeof SvelteComponent; // Optional component to render for the item (Svelte component type)
}

let dynamicItems: IndexItem[] = []; // Array to hold the currently loaded dynamic items

/**
 * Loads a new set of dynamic items.
 * @param items - Array of IndexItem objects to load
 */
export function loadDynamicItems(items: IndexItem[]) {
  dynamicItems = items; // Assigns the provided items to the dynamicItems array
}

/**
 * Returns all currently loaded dynamic items.
 * @returns Array of IndexItem objects
 */
export function getDynamicItems(): IndexItem[] {
  return dynamicItems; // Returns the current list of dynamic items
}
