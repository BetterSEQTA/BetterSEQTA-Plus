import type { VectorSearchResult } from "./vectorTypes";
//import vectorSearchWorker from "./vectorSearchWorker?worker";

export function searchVectors(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
  //return VectorSearchWorkerManager.getInstance().search(query, topK);
  return new Promise((resolve) => {
    resolve([]);
  });
}

/* class VectorSearchWorkerManager {
  private static instance: VectorSearchWorkerManager;
  private worker: Worker | null = null;
  private pendingSearches = new Map<string, (results: VectorSearchResult[]) => void>();

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    try {
      this.worker = new vectorSearchWorker({ name: "vectorSearchWorker" });
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
    console.log("Searching vectors", query, topK);
    if (!this.worker) {
      this.initWorker();
    }

    const messageId = crypto.randomUUID();
    return new Promise((resolve) => {
      this.pendingSearches.set(messageId, resolve);
      this.worker?.postMessage({
        type: "search",
        data: { query, topK },
        messageId
      });
    });
  }
}

export default VectorSearchWorkerManager; */