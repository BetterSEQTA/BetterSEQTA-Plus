import type { SvelteComponent } from "svelte"; // Import the SvelteComponent type for potential use with dynamic rendering

// Defines the structure of an index item used in jobs
export interface IndexItem {
  id: string;                   // Unique identifier for the item
  text: string;                 // Display text for the item
  category: string;            // Category to which the item belongs
  content: string;             // Detailed content of the item
  dateAdded: number;           // Timestamp when the item was added
  metadata: Record<string, any>; // Additional data associated with the item
  actionId: string;            // Identifier used to determine the action to perform
  renderComponentId: string;   // Identifier used to determine the component used for rendering
}

// Defines the frequency with which a job should run
export type Frequency =
  | "pageLoad"                        // Run when the page loads
  | { type: "interval"; ms: number } // Run at a specified interval in milliseconds
  | { type: "expiry"; afterMs: number }; // Run after a certain amount of time has passed

// Context object passed to job functions, providing utility methods for state management
export interface JobContext {
  getStoredItems: (storeId?: string) => Promise<IndexItem[]>;       // Retrieve stored items for a given store ID
  setStoredItems: (items: IndexItem[], storeId?: string) => Promise<void>; // Set stored items for a given store ID
  addItem: (item: IndexItem, storeId?: string) => Promise<void>;    // Add an item to the store
  removeItem: (id: string, storeId?: string) => Promise<void>;      // Remove an item from the store by ID
  getProgress: <T = any>() => Promise<T | undefined>;               // Get persisted job progress, if any
  setProgress: <T = any>(progress: T) => Promise<void>;             // Set job progress for later retrieval
}

// Defines the structure of a job that can be executed
export interface Job {
  id: string;                                           // Unique identifier for the job
  label: string;                                        // Human-readable label for the job
  frequency: Frequency;                                 // Defines how often the job should run
  renderComponentId: string;                            // Identifier of the component used for rendering job results
  run: (ctx: JobContext) => Promise<IndexItem[]>;       // Function that runs the job and returns new index items
  purge?: (items: IndexItem[]) => IndexItem[];          // Optional function to remove old or irrelevant items
}
