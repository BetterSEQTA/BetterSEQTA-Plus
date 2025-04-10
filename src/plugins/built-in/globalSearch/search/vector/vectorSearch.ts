import type { VectorSearchResult } from "./vectorTypes";
import vectorSearchWorker from "./vectorSearchWorker?inlineWorker";

export function searchVectors(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
  return VectorSearchWorkerManager.getInstance().search(query, topK);
  /* return new Promise((resolve) => {
    resolve([]);
  }); */
}

class VectorSearchWorkerManager {
  private static instance: VectorSearchWorkerManager;
  private worker: Worker | null = null;
  private pendingSearches = new Map<string, (results: VectorSearchResult[]) => void>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastSearchParams: { query: string; topK: number; resolve: (results: VectorSearchResult[]) => void } | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = vectorSearchWorker();
      this.worker.addEventListener('message', this.messageHandler);
    } catch (e) {
      console.error("Failed to initialize vector search:", e);
      throw e;
    }
  }

  private messageHandler = (e: MessageEvent) => {
    console.log("Message received", e.data);
    if (e.data.type === 'searchResults') {
      const resolve = this.pendingSearches.get(e.data.data.messageId);
      if (resolve) {
        resolve(e.data.data.results);
        this.pendingSearches.delete(e.data.data.messageId);
      }
    }
  };

  public static getInstance(): VectorSearchWorkerManager {
    if (!VectorSearchWorkerManager.instance) {
      VectorSearchWorkerManager.instance = new VectorSearchWorkerManager();
    }
    return VectorSearchWorkerManager.instance;
  }

  public async search(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
    if (!this.worker) {
      this.initWorker();
    }
  
    return new Promise((resolve) => {
      this.lastSearchParams = { query, topK, resolve };
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        const messageId = crypto.randomUUID();
        if (this.lastSearchParams) {
          this.pendingSearches.set(messageId, this.lastSearchParams.resolve);
          this.worker?.postMessage({
            type: "search",
            data: { query: this.lastSearchParams.query, topK: this.lastSearchParams.topK },
            messageId
          });
          this.lastSearchParams = null;
        }
        this.debounceTimer = null;
      }, query !== '' ? 300 : 0);
    });
  }

  public terminate() {
    if (this.worker) {
      for (const [messageId, resolve] of this.pendingSearches.entries()) {
        resolve([]);
        this.pendingSearches.delete(messageId);
      }

      this.worker.terminate();
      this.worker = null;
    }
  }
}

export default VectorSearchWorkerManager;