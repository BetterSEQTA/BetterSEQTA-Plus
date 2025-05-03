import type { HydratedIndexItem } from '../types';
import vectorWorker from './vectorWorker.ts?inlineWorker';
import type { SearchResult } from 'client-vector-search';

export type ProgressCallback = (data: {
  status: 'started' | 'processing' | 'complete' | 'error' | 'cancelled';
  total?: number;
  processed?: number;
  message?: string;
}) => void;

export class VectorWorkerManager {
  private static instance: VectorWorkerManager;
  private worker: Worker | null = null;
  private isInitialized = false;
  private readyPromise: Promise<void> | null = null; // To await initialization
  private progressCallback: ProgressCallback | null = null;
  private searchPromises = new Map<string, { resolve: (value: SearchResult[]) => void, reject: (reason?: any) => void, timer: NodeJS.Timeout }>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private lastSearchParams: { query: string; topK: number; resolve: (results: SearchResult[]) => void, reject: (reason?: any) => void } | null = null;


  private constructor() {
    // Start initialization immediately, but allow awaiting it
    this.readyPromise = this.initWorker();
  }

  static getInstance(): VectorWorkerManager {
    if (!VectorWorkerManager.instance) {
      VectorWorkerManager.instance = new VectorWorkerManager();
    }
    return VectorWorkerManager.instance;
  }

  private async initWorker(): Promise<void> {
    // If already initialized or initializing, return the existing promise
    if (this.isInitialized) return Promise.resolve();
    if (this.readyPromise) return this.readyPromise;

    return new Promise<void>((resolve, reject) => {
        // Create the worker
        this.worker = vectorWorker();

        const timeout = setTimeout(() => {
            console.error('Vector worker initialization timed out');
            this.worker?.terminate(); // Clean up worker if it exists
            this.worker = null;
            this.isInitialized = false; // Ensure state reflects failure
            this.readyPromise = null; // Allow retrying init later
            reject(new Error('Worker initialization timed out'));
        }, 10000); // Increased timeout

        // Set up message handling
        this.worker!.addEventListener('message', (e) => {
          const { type, data } = e.data;
          console.debug("Message from vector worker:", type, data);

          switch (type) {
            case 'ready':
              this.isInitialized = true;
              clearTimeout(timeout);
              console.debug('Vector worker initialized and ready.');
              resolve(); // Resolve the init promise
              break;

            case 'progress':
              if (this.progressCallback) {
                this.progressCallback(data);
              }
              break;

            case 'searchResults':
              const searchInfo = this.searchPromises.get(data.messageId);
              if (searchInfo) {
                clearTimeout(searchInfo.timer); // Clear timeout on success
                searchInfo.resolve(data.results);
                this.searchPromises.delete(data.messageId);
              } else {
                console.warn('Received search results for unknown messageId:', data.messageId);
              }
              break;

            case 'searchError':
              const errorInfo = this.searchPromises.get(data.messageId);
              if (errorInfo) {
                clearTimeout(errorInfo.timer); // Clear timeout on error
                errorInfo.reject(new Error(data.error));
                this.searchPromises.delete(data.messageId);
              } else {
                console.warn('Received search error for unknown messageId:', data.messageId);
              }
              break;

            case 'searchCancelled':
              const cancelledInfo = this.searchPromises.get(data.messageId);
              if (cancelledInfo) {
                 clearTimeout(cancelledInfo.timer); // Clear timeout on cancel
                 // Reject with a specific cancellation error or resolve with empty? Let's reject.
                 cancelledInfo.reject(new Error('Search cancelled by worker'));
                 this.searchPromises.delete(data.messageId);
              } else {
                console.debug('Received cancellation for unknown messageId:', data.messageId);
              }
              break;

            default:
              console.warn('Unknown message from worker:', type, data);
          }
        });

        // Initialize the worker
        this.worker!.postMessage({ type: 'init' });
    });
  }

  // Ensures worker is ready before proceeding
  private async ensureReady() {
    if (!this.readyPromise) {
        // If init wasn't called or failed, try again
        console.warn("Worker not initialized, attempting init...");
        this.readyPromise = this.initWorker();
    }
    await this.readyPromise;
    if (!this.isInitialized || !this.worker) {
        throw new Error("Vector Worker is not available after initialization attempt.");
    }
  }

  async processItems(items: HydratedIndexItem[], onProgress?: ProgressCallback) {
    await this.ensureReady(); // Wait for worker to be ready

    this.progressCallback = onProgress || null;

    // Cancel any ongoing search when starting processing
    this.cancelAllSearches("Processing started");

    console.debug(`Sending ${items.length} items to worker for processing.`);
    this.worker!.postMessage({
      type: 'process',
      data: { items }
    });
  }

  // Public search method
  public async search(query: string, topK: number = 10): Promise<SearchResult[]> {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      this.lastSearchParams = { query, topK, resolve, reject };

      const messageId = crypto.randomUUID();
      if (this.lastSearchParams && this.worker) {
        const currentParams = this.lastSearchParams; // Capture current params
        this.lastSearchParams = null; // Clear last params *before* posting
        this.debounceTimer = null;

        // Set a timeout for the search operation itself
        const searchTimeout = 10000; // e.g., 10 seconds
        const searchTimer = setTimeout(() => {
            if (this.searchPromises.has(messageId)) {
                console.error(`Search timed out for messageId: ${messageId}`);
                currentParams.reject(new Error(`Search timed out after ${searchTimeout}ms`));
                this.searchPromises.delete(messageId);
            }
        }, searchTimeout);


        this.searchPromises.set(messageId, { resolve: currentParams.resolve, reject: currentParams.reject, timer: searchTimer });

        console.debug(`Sending search request (ID: ${messageId}) to worker: "${currentParams.query}"`);
        this.worker.postMessage({
          type: "search",
          data: { query: currentParams.query, topK: currentParams.topK },
          messageId
        });
      } else if (this.lastSearchParams) {
            // This case might happen if ensureReady failed but didn't throw
            console.error("Worker unavailable when trying to send search request.");
            this.lastSearchParams.reject(new Error("Worker unavailable for search"));
            this.lastSearchParams = null;
            this.debounceTimer = null;
      }
    });
  }

  // Method to cancel all pending/debounced searches
  private cancelAllSearches(reason: string = "Cancelled") {
     if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
        if (this.lastSearchParams) {
            this.lastSearchParams.reject(new Error(`Search cancelled: ${reason}`));
            this.lastSearchParams = null;
        }
     }
     // We might also want to tell the worker to cancel its *current* search
     // if it supports it, but this requires worker modification.
     // For now, just reject pending promises in the manager.
     for (const [messageId, promiseInfo] of this.searchPromises.entries()) {
        clearTimeout(promiseInfo.timer);
        promiseInfo.reject(new Error(`Search cancelled: ${reason}`));
        this.searchPromises.delete(messageId);
     }
  }


  terminate() {
    console.debug("Terminating Vector Worker Manager...");
    this.cancelAllSearches("Worker terminated"); // Cancel pending searches

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.readyPromise = null; // Reset init promise
    this.progressCallback = null;
    // Clear the static instance? Or assume app lifecycle handles this?
    // VectorWorkerManager.instance = null; // Uncomment if needed
  }
}