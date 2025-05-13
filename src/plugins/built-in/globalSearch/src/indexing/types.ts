import type { SvelteComponent } from "svelte";

export interface IndexItem {
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

export type Frequency =
  | "pageLoad"
  | { type: "interval"; ms: number }
  | { type: "expiry"; afterMs: number };

export interface JobContext {
  getStoredItems: (storeId?: string) => Promise<IndexItem[]>;
  setStoredItems: (items: IndexItem[], storeId?: string) => Promise<void>;
  addItem: (item: IndexItem, storeId?: string) => Promise<void>;
  removeItem: (id: string, storeId?: string) => Promise<void>;
  getProgress: <T = any>() => Promise<T | undefined>;
  setProgress: <T = any>(progress: T) => Promise<void>;
}

export interface Job {
  id: string;
  label: string;
  frequency: Frequency;
  renderComponentId: string;
  run: (ctx: JobContext) => Promise<IndexItem[]>;
  purge?: (items: IndexItem[]) => IndexItem[];
  boostCriteria?: (item: IndexItem, searchTerm: string) => number;
}
