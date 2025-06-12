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
  private initializationMutex = false;
  private idleTimer: NodeJS.Timeout | null = null;
  private unloadTimer: NodeJS.Timeout | null = null;

  private streamingSession: {
    isActive: boolean;
    totalExpected: number;
    totalSent: number;
    batchBuffer: IndexItem[];
    batchSize: number;
    flushTimer: NodeJS.Timeout | null;
    jobId?: string;
    inactivityTimer: NodeJS.Timeout | null;
    lastActivityTime: number;
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

        reject(new Error("Worker initialization timed out"));
      }, 10000);

      this.worker!.addEventListener("message", (e) => {
        const { type, data } = e.data;
        console.debug("Message from vector worker:", type, data);

        switch (type) {
          case "ready":
            this.isInitialized = true;
            clearTimeout(timeout);
            this.updateActivity(); // Start idle timer after initialization
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

                window.dispatchEvent(
                  new CustomEvent("dynamic-items-updated", {
                    detail: {
                      incremental: true,
                      jobId: "vectorization",
                      vectorUpdate: true,
                    },
                  }),
                );
              }

              if (data.status === "complete" || data.status === "cancelled" || data.status === "error") {
                this.scheduleUnload();
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
    this.initializationMutex = false;
    this.clearIdleTimer();
    this.clearUnloadTimer();
    if (this.streamingSession?.isActive) {
      this.endStreamingSession();
    }
  }

  private startIdleTimer() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      if (!this.streamingSession?.isActive && this.isInitialized) {
        console.debug("[VectorWorker] Auto-shutting down due to 2 minutes of inactivity");
        this.resetWorkerState();
      }
    }, 120000); // 2 minutes
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearUnloadTimer() {
    if (this.unloadTimer) {
      clearTimeout(this.unloadTimer);
      this.unloadTimer = null;
    }
  }

  private scheduleUnload(delay: number = 10000) {
    this.clearUnloadTimer();
    this.unloadTimer = setTimeout(() => {
      if (!this.streamingSession?.isActive && this.isInitialized) {
        console.debug("[VectorWorker] Auto-unloading after processing complete");
        this.resetWorkerState();
      }
    }, delay);
  }

  private updateActivity() {
    this.clearUnloadTimer();
    this.startIdleTimer();
  }

  private async ensureReady() {
    if (this.initializationMutex) {
      while (this.initializationMutex) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (this.isInitialized && this.worker) {
        return;
      }
    }

    if (this.readyPromise) {
      try {
        await this.readyPromise;
      } catch (error) {
        console.warn(
          "Previous worker initialization failed, resetting state and retrying...",
          error,
        );
        this.resetWorkerState();
      }
    }

    if (this.isInitialized && this.worker) {
      return;
    }

    if (!this.readyPromise && !this.initializationMutex) {
      console.warn("Worker not initialized, attempting init...");
      this.initializationMutex = true;
      try {
        this.readyPromise = this.initWorker();
        await this.readyPromise;
      } finally {
        this.initializationMutex = false;
      }
    }

    if (!this.isInitialized || !this.worker) {
      throw new Error(
        "Vector Worker is not available after initialization attempt.",
      );
    }
  }

  async processItems(items: IndexItem[], onProgress?: ProgressCallback) {
    // Only initialize worker if we actually have items to process
    if (items.length === 0) {
      if (onProgress) {
        onProgress({
          status: "complete",
          message: "No items to process"
        });
      }
      return;
    }

    const uniqueItems = items.filter((item, index, arr) => {
      return arr.findIndex((i) => i.id === item.id) === index;
    });

    if (uniqueItems.length !== items.length) {
      console.debug(
        `Filtered out ${items.length - uniqueItems.length} duplicate items before processing`,
      );
    }

    // If after deduplication we have no items, don't initialize worker
    if (uniqueItems.length === 0) {
      if (onProgress) {
        onProgress({
          status: "complete",
          message: "No unique items to process after deduplication"
        });
      }
      return;
    }

    await this.ensureReady();

    if (this.streamingSession?.isActive) {
      console.warn("Cannot process items while streaming session is active");
      if (onProgress) {
        onProgress({
          status: "error",
          message: "Cannot process items while streaming session is active",
        });
      }
      return;
    }

    this.progressCallback = onProgress || null;
    this.updateActivity();

    console.debug(
      `Sending ${uniqueItems.length} unique items to worker for processing.`,
    );

    this.worker!.postMessage({
      type: "process",
      data: { items: uniqueItems },
    });
  }

  async startStreamingSession(
    totalExpectedItems: number,
    onProgress?: ProgressCallback,
    batchSize: number = 10,
    jobId?: string,
  ): Promise<void> {
    // Only initialize if we expect items to process
    if (totalExpectedItems === 0) {
      console.debug("[VectorWorker] No items expected, not starting streaming session");
      return;
    }

    await this.ensureReady();

    if (this.streamingSession?.isActive) {
      if (this.streamingSession.jobId !== jobId) {
        console.warn(
          `Ending existing streaming session for job ${this.streamingSession.jobId} to start new session for job ${jobId}`,
        );
        await this.endStreamingSession();

        await new Promise((resolve) => setTimeout(resolve, 100));
      } else {
        console.debug(`Streaming session for job ${jobId} already active`);
        return;
      }
    }

    this.progressCallback = onProgress || null;
    this.updateActivity();

    this.streamingSession = {
      isActive: true,
      totalExpected: totalExpectedItems,
      totalSent: 0,
      batchBuffer: [],
      batchSize,
      flushTimer: null,
      jobId,
      inactivityTimer: null,
      lastActivityTime: Date.now(),
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

    const uniqueItems = items.filter((item, index, arr) => {
      return arr.findIndex((i) => i.id === item.id) === index;
    });

    if (uniqueItems.length !== items.length) {
      console.debug(
        `[Streaming] Filtered out ${items.length - uniqueItems.length} duplicate items before streaming`,
      );
    }

    if (uniqueItems.length > 0) {
      this.streamingSession.batchBuffer.push(...uniqueItems);
      this.streamingSession.lastActivityTime = Date.now();
      this.updateActivity(); // Update worker activity

      if (this.streamingSession.inactivityTimer) {
        clearTimeout(this.streamingSession.inactivityTimer);
      }

      this.streamingSession.inactivityTimer = setTimeout(() => {
        if (this.streamingSession?.isActive) {
          console.debug(
            "[VectorWorker] Auto-ending streaming session due to inactivity",
          );
          this.endStreamingSession();
        }
      }, 30000);
    }

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

    if (this.streamingSession.inactivityTimer) {
      clearTimeout(this.streamingSession.inactivityTimer);
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
    this.scheduleUnload();
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
