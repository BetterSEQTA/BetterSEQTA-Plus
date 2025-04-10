import type { HydratedIndexItem } from '../types';
import vectorWorker from './vectorWorker.ts?inlineWorker';
import type { SearchResult } from 'client-vector-search';

export type ProgressCallback = (data: {
  status: 'started' | 'processing' | 'complete';
  total?: number;
  processed?: number;
  message?: string;
}) => void;

export class VectorWorkerManager {
  private static instance: VectorWorkerManager;
  private worker: Worker | null = null;
  private isInitialized = false;
  private progressCallback: ProgressCallback | null = null;
  private searchPromises = new Map<string, { resolve: (value: SearchResult[]) => void, reject: (reason?: any) => void }>();

  private constructor() {}

  static getInstance(): VectorWorkerManager {
    if (!VectorWorkerManager.instance) {
      VectorWorkerManager.instance = new VectorWorkerManager();
    }
    return VectorWorkerManager.instance;
  }

  async init() {
    if (this.isInitialized) return;

    // Create the worker
    this.worker = vectorWorker();

    // Set up message handling
    this.worker.addEventListener('message', (e) => {
      const { type, data } = e.data;
      console.log(e);
      
      switch (type) {
        case 'ready':
          this.isInitialized = true;
          console.debug('Vector worker initialized');
          break;
          
        case 'progress':
          if (this.progressCallback) {
            this.progressCallback(data);
          }
          break;

        case 'searchResults':
          const searchPromise = this.searchPromises.get(data.messageId);
          if (searchPromise) {
            searchPromise.resolve(data.results);
            this.searchPromises.delete(data.messageId);
          } else {
            console.warn('Received search results for unknown messageId:', data.messageId);
          }
          break;

        case 'searchError':
          const errorPromise = this.searchPromises.get(data.messageId);
          if (errorPromise) {
            errorPromise.reject(new Error(data.error));
            this.searchPromises.delete(data.messageId);
          } else {
            console.warn('Received search error for unknown messageId:', data.messageId);
          }
          break;

        case 'searchCancelled':
          const cancelledPromise = this.searchPromises.get(data.messageId);
          if (cancelledPromise) {
            cancelledPromise.reject(new Error('Search cancelled'));
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
    this.worker.postMessage({ type: 'init' });

    // Wait for ready message
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker initialization timed out'));
      }, 5000);

      const checkInit = (e: MessageEvent) => {
        if (e.data.type === 'ready') {
          this.worker!.removeEventListener('message', checkInit);
          clearTimeout(timeout);
          resolve();
        }
      };
      this.worker!.addEventListener('message', checkInit);
    });
  }

  async processItems(items: HydratedIndexItem[], onProgress?: ProgressCallback) {
    if (!this.isInitialized) {
      await this.init();
    }

    this.progressCallback = onProgress || null;
    
    this.worker!.postMessage({
      type: 'process',
      data: { items }
    });
  }

  terminate() {
    if (this.worker) {
      // Clean up any pending promises
      for (const [messageId, promise] of this.searchPromises.entries()) {
        promise.reject(new Error('Worker terminated'));
        this.searchPromises.delete(messageId);
      }
      
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
} 