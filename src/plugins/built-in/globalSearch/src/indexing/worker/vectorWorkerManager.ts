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
  } | null = null;

  private constructor() {}

  static getInstance(): VectorWorkerManager {
    if (!VectorWorkerManager.instance) {
      VectorWorkerManager.instance = new VectorWorkerManager();
    }
    return VectorWorkerManager.instance;
  }

  private async initWorker(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (this.readyPromise) return this.readyPromise;

    console.debug("Lazy-loading vector worker...");

    return new Promise<void>((resolve, reject) => {
      this.worker = vectorWorker();

      console.log("Worker initialized", this.worker);

      const timeout = setTimeout(() => {
        console.error("Vector worker initialization timed out");
        this.worker?.terminate();
        this.worker = null;
        this.isInitialized = false;
        this.readyPromise = null;
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

  private async ensureReady() {
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
  ): Promise<void> {
    await this.ensureReady();

    if (this.streamingSession?.isActive) {
      this.endStreamingSession();
    }

    this.progressCallback = onProgress || null;

    this.streamingSession = {
      isActive: true,
      totalExpected: totalExpectedItems,
      totalSent: 0,
      batchBuffer: [],
      batchSize,
      flushTimer: null,
    };

    console.debug(
      `Starting streaming session for ${totalExpectedItems} items with batch size ${batchSize}`,
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
        message: "Starting streaming vectorization",
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

    if (this.streamingSession?.isActive) {
      this.endStreamingSession();
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.readyPromise = null;
    this.progressCallback = null;
  }
}
