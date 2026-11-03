import type { MountableSvelteComponent } from "@/types/mountableComponent";

export interface IndexItem {
  id: string;
  text: string;
  category: string;
  content: string;
  dateAdded: number;
  metadata: Record<string, unknown>;
  actionId: string;
  renderComponentId: string;
  renderComponent?: MountableSvelteComponent;
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
  getProgress: <T = unknown>() => Promise<T | undefined>;
  setProgress: <T = unknown>(progress: T) => Promise<void>;
  /** Optional live status/progress while a long-running job is in flight. */
  reportJobProgress?: (detail: { processed: number; total: number; status?: string }) => void;
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
