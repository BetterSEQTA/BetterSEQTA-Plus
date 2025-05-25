import { refreshVectorCache } from "../../search/vector/vectorSearch";
import type { IndexItem } from "../types";
import vectorWorker from "./vectorWorker.ts?inlineWorker";

export type ProgressCallback = (data: {
  status: "started" | "processing" | "complete" | "error" | "cancelled";
  total?: number;
  processed?: number;
  message?: string;
}) => void;

export class VectorWorkerManager {
  private static instance: VectorWorkerManager;
  private worker: Worker | null = null;
  private isInitialized = false;
  private readyPromise: Promise<void> | null = null;
  private progressCallback: ProgressCallback | null = null;

  private streamingSession: {
    isActive: boolean;
    totalExpected: number;
    totalSent: number;
    batchBuffer: IndexItem[];
    batchSize: number;
    flushTimer: NodeJS.Timeout | null;
    jobId?: string; // Track which job owns the session
  } | null = null;

  private constructor() {}

  static getInstance(): VectorWorkerManager {
    if (!VectorWorkerManager.instance) {
      console.debug("Creating new VectorWorkerManager instance");
      VectorWorkerManager.instance = new VectorWorkerManager();
    }
    return VectorWorkerManager.instance;
  }

  private async initWorker(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (this.readyPromise) return this.readyPromise;

    console.debug("Lazy-loading vector worker...");

    return new Promise<void>((resolve, reject) => {
      // Terminate any existing worker before creating a new one
      if (this.worker) {
        console.debug("Terminating existing worker before creating new one");
        this.worker.terminate();
        this.worker = null;
      }
      
      console.debug("Creating new vector worker instance");
      this.worker = vectorWorker();

      console.log("Worker initialized", this.worker);

      const timeout = setTimeout(() => {
        console.error("Vector worker initialization timed out");
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
        this.isInitialized = false;
        // Don't reset readyPromise here to prevent race conditions
        // It will be reset when a new initialization is attempted
        reject(new Error("Worker initialization timed out"));
      }, 10000);

      this.worker!.addEventListener("message", (e) => {
        const { type, data } = e.data;
        console.debug("Message from vector worker:", type, data);

        switch (type) {
          case "ready":
            this.isInitialized = true;
            clearTimeout(timeout);
            console.debug("Vector worker initialized and ready.");
            resolve();
            break;

          case "progress":
            if (this.progressCallback) {
              this.progressCallback(data);

              if (data.status === "complete") {
                refreshVectorCache();

                if (this.streamingSession?.isActive) {
                  this.endStreamingSession();
                }
                
                // Dispatch search update when vectorization completes
                window.dispatchEvent(new CustomEvent("dynamic-items-updated", { 
                  detail: { incremental: true, jobId: "vectorization", vectorUpdate: true } 
                }));
              }
            }
            break;

          case "streamingProgress":
            if (this.progressCallback && this.streamingSession?.isActive) {
              const { processed } = data;
              this.progressCallback({
                status: "processing",
                processed,
                total: this.streamingSession.totalExpected,
                message: `Streaming vectorization: ${processed}/${this.streamingSession.totalExpected} items`,
              });
            }
            break;

          default:
            console.warn("Unknown message from worker:", type, data);
        }
      });

      this.worker!.postMessage({ type: "init" });
    });
  }

  private resetWorkerState() {
    console.debug("Resetting vector worker state");
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.readyPromise = null;
    this.progressCallback = null;
    if (this.streamingSession?.isActive) {
      this.endStreamingSession();
    }
  }

  private async ensureReady() {
    // If we already have a ready promise, wait for it regardless of outcome
    if (this.readyPromise) {
      try {
        await this.readyPromise;
      } catch (error) {
        // If the previous initialization failed, reset state and try again
        console.warn("Previous worker initialization failed, resetting state and retrying...", error);
        this.resetWorkerState();
      }
    }
    
    // Double-check if we're actually ready after waiting
    if (this.isInitialized && this.worker) {
      return;
    }
    
    // If we're not ready and there's no active promise, create one
    if (!this.readyPromise) {
      console.warn("Worker not initialized, attempting init...");
      this.readyPromise = this.initWorker();
    }
    
    await this.readyPromise;
    if (!this.isInitialized || !this.worker) {
      throw new Error(
        "Vector Worker is not available after initialization attempt.",
      );
    }
  }

  async processItems(items: IndexItem[], onProgress?: ProgressCallback) {
    await this.ensureReady();

    // Don't allow regular processing if streaming is active
    if (this.streamingSession?.isActive) {
      console.warn("Cannot process items while streaming session is active");
      if (onProgress) {
        onProgress({
          status: "error",
          message: "Cannot process items while streaming session is active"
        });
      }
      return;
    }

    this.progressCallback = onProgress || null;

    console.debug(`Sending ${items.length} items to worker for processing.`);

    this.worker!.postMessage({
      type: "process",
      data: { items: items },
    });
  }

  async startStreamingSession(
    totalExpectedItems: number,
    onProgress?: ProgressCallback,
    batchSize: number = 10,
    jobId?: string,
  ): Promise<void> {
    await this.ensureReady();

    // Check if another job already has an active streaming session
    if (this.streamingSession?.isActive) {
      if (this.streamingSession.jobId !== jobId) {
        console.warn(`Cannot start streaming session for job ${jobId} - job ${this.streamingSession.jobId} already has an active session`);
        if (onProgress) {
          onProgress({
            status: "error",
            message: `Another job (${this.streamingSession.jobId}) already has an active streaming session`
          });
        }
        return;
      } else {
        console.debug(`Streaming session for job ${jobId} already active`);
        return;
      }
    }

    this.progressCallback = onProgress || null;

    this.streamingSession = {
      isActive: true,
      totalExpected: totalExpectedItems,
      totalSent: 0,
      batchBuffer: [],
      batchSize,
      flushTimer: null,
      jobId,
    };

    console.debug(
      `Starting streaming session for job ${jobId} with ${totalExpectedItems} items (batch size ${batchSize})`,
    );

    this.worker!.postMessage({
      type: "startStreaming",
      data: { totalExpected: totalExpectedItems, batchSize },
    });

    if (this.progressCallback) {
      this.progressCallback({
        status: "started",
        total: totalExpectedItems,
        processed: 0,
        message: `Starting streaming vectorization for ${jobId}`,
      });
    }
  }

  async streamItems(items: IndexItem[]): Promise<void> {
    if (!this.streamingSession?.isActive) {
      throw new Error(
        "No active streaming session. Call startStreamingSession first.",
      );
    }

    this.streamingSession.batchBuffer.push(...items);

    if (
      this.streamingSession.batchBuffer.length >=
      this.streamingSession.batchSize
    ) {
      await this.flushBatch();
    } else {
      if (this.streamingSession.flushTimer) {
        clearTimeout(this.streamingSession.flushTimer);
      }

      this.streamingSession.flushTimer = setTimeout(() => {
        this.flushBatch();
      }, 1000);
    }
  }

  private async flushBatch(): Promise<void> {
    if (
      !this.streamingSession?.isActive ||
      this.streamingSession.batchBuffer.length === 0
    ) {
      return;
    }

    const batch = [...this.streamingSession.batchBuffer];
    this.streamingSession.batchBuffer = [];
    this.streamingSession.totalSent += batch.length;

    if (this.streamingSession.flushTimer) {
      clearTimeout(this.streamingSession.flushTimer);
      this.streamingSession.flushTimer = null;
    }

    console.debug(
      `Streaming batch of ${batch.length} items to worker (${this.streamingSession.totalSent}/${this.streamingSession.totalExpected})`,
    );

    this.worker!.postMessage({
      type: "streamBatch",
      data: {
        items: batch,
        isLast:
          this.streamingSession.totalSent >=
          this.streamingSession.totalExpected,
      },
    });
  }

  async endStreamingSession(): Promise<void> {
    if (!this.streamingSession?.isActive) {
      return;
    }

    await this.flushBatch();

    if (this.streamingSession.flushTimer) {
      clearTimeout(this.streamingSession.flushTimer);
    }

    this.streamingSession.isActive = false;

    this.worker!.postMessage({
      type: "endStreaming",
    });

    console.debug("Streaming session ended");

    if (this.progressCallback) {
      this.progressCallback({
        status: "complete",
        total: this.streamingSession.totalExpected,
        processed: this.streamingSession.totalSent,
        message: "Streaming vectorization complete",
      });
    }

    this.streamingSession = null;
  }

  async streamItem(item: IndexItem): Promise<void> {
    return this.streamItems([item]);
  }

  isStreamingActive(): boolean {
    return this.streamingSession?.isActive ?? false;
  }

  getStreamingProgress(): {
    sent: number;
    expected: number;
    buffered: number;
  } | null {
    if (!this.streamingSession?.isActive) {
      return null;
    }

    return {
      sent: this.streamingSession.totalSent,
      expected: this.streamingSession.totalExpected,
      buffered: this.streamingSession.batchBuffer.length,
    };
  }

  terminate() {
    console.debug("Terminating Vector Worker Manager...");
    this.resetWorkerState();
  }

  async resetWorker(): Promise<void> {
    console.debug("Resetting vector worker...");
    
    if (this.streamingSession?.isActive) {
      await this.endStreamingSession();
    }
    
    await this.ensureReady();
    
    this.worker!.postMessage({ type: "reset" });
    
    console.debug("Reset command sent to worker");
  }
}
