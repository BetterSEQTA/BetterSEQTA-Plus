import type { SvelteComponent } from 'svelte';

export interface IndexItem {
  id: string;
  text: string;
  category: string;
  content: string;
  dateAdded: number;
  metadata: Record<string, any>;
  actionId: string;
  renderComponentId: string;
}

export interface HydratedIndexItem extends IndexItem {
  renderComponent: typeof SvelteComponent;
}

export type Frequency =
  | 'pageLoad'
  | { type: 'interval'; ms: number }
  | { type: 'expiry'; afterMs: number };

export interface JobContext {
  getStoredItems: () => Promise<IndexItem[]>;
  setStoredItems: (items: IndexItem[]) => Promise<void>;
  addItem: (item: IndexItem) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export interface Job {
  id: string;
  label: string;
  frequency: Frequency;
  renderComponentId: string;
  run: (ctx: JobContext) => Promise<IndexItem[]>;
  purge?: (items: IndexItem[]) => IndexItem[];
}
