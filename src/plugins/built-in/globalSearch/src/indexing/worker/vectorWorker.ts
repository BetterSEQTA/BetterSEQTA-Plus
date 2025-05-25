import { EmbeddingIndex, getEmbedding, initializeModel } from "embeddia";
import type { IndexItem } from "../types";

let vectorIndex: EmbeddingIndex | null = null;
let isInitialized = false;
let currentAbortController: AbortController | null = null;

let streamingSession: {
  isActive: boolean;
  totalExpected: number;
  totalReceived: number;
  totalProcessed: number;
  batchSize: number;
  pendingItems: IndexItem[];
  processingPromise: Promise<void> | null;
} | null = null;

async function initWorker() {
  if (isInitialized) {
    console.debug("Vector worker already initialized.");
    return;
  }
  console.debug("Initializing vector worker...");
  try {
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);

    const stored = await vectorIndex.getAllObjectsFromIndexedDB();
    if (stored.length > 0) {
      stored.forEach((item) => vectorIndex!.add(item));
      console.debug(
        `Vector index loaded ${stored.length} items from IndexedDB.`,
      );
    } else {
      console.debug("No existing vector index found in IndexedDB.");
    }
    isInitialized = true;
    console.debug("Vector worker initialized successfully.");
  } catch (e) {
    console.error("Failed to initialize vector worker:", e);
    isInitialized = true;
    vectorIndex = null;
  }
}

async function vectorizeItem(
  item: IndexItem,
): Promise<(IndexItem & { embedding: number[] }) | null> {
  try {
    const textToEmbed = [
      item.text,
      item.content,
      item.category,
      item.metadata?.author,
      item.metadata?.subject,
    ]
      .filter(Boolean)
      .join(" ");

    const embedding = await getEmbedding(textToEmbed);
    return { ...item, embedding };
  } catch (error) {
    console.error(`Error vectorizing item ${item.id}:`, error);
    return null;
  }
}

async function startStreamingSession(
  totalExpected: number,
  batchSize: number = 5,
) {
  if (!vectorIndex) {
    console.warn(
      "Streaming requested but vector index not ready. Attempting init.",
    );
    await initWorker();
    if (!vectorIndex) {
      self.postMessage({
        type: "progress",
        data: {
          status: "error",
          message:
            "Vector index not available for streaming after init attempt.",
        },
      });
      return;
    }
  }

  if (streamingSession?.isActive) {
    await endStreamingSession();
  }

  streamingSession = {
    isActive: true,
    totalExpected,
    totalReceived: 0,
    totalProcessed: 0,
    batchSize,
    pendingItems: [],
    processingPromise: null,
  };

  console.debug(
    `Started streaming session for ${totalExpected} items with batch size ${batchSize}`,
  );

  self.postMessage({
    type: "streamingProgress",
    data: {
      processed: 0,
      total: totalExpected,
      message: "Streaming session started",
    },
  });
}

async function processStreamingBatch(
  items: IndexItem[],
  isLast: boolean = false,
) {
  if (!streamingSession?.isActive) {
    console.warn("Received streaming batch but no active session");
    return;
  }

  streamingSession.totalReceived += items.length;
  streamingSession.pendingItems.push(...items);

  console.debug(
    `Received streaming batch: ${items.length} items (${streamingSession.totalReceived}/${streamingSession.totalExpected})`,
  );

  const shouldProcess =
    streamingSession.pendingItems.length >= streamingSession.batchSize ||
    isLast;

  if (shouldProcess && !streamingSession.processingPromise) {
    streamingSession.processingPromise = processStreamingItems();
  }
}

async function processStreamingItems() {
  if (!streamingSession?.isActive || !vectorIndex) {
    return;
  }

  while (
    streamingSession.pendingItems.length > 0 &&
    streamingSession.isActive
  ) {
    const batchToProcess = streamingSession.pendingItems.splice(
      0,
      streamingSession.batchSize,
    );

    const unprocessedItems = batchToProcess.filter((item) => {
      try {
        return !vectorIndex!.get({ id: item.id });
      } catch (e) {
        return true;
      }
    });

    if (unprocessedItems.length === 0) {
      streamingSession.totalProcessed += batchToProcess.length;
      continue;
    }

    const vectorizationResults = await Promise.all(
      unprocessedItems.map(vectorizeItem),
    );
    const successfullyVectorized = vectorizationResults.filter(
      (result) => result !== null,
    ) as (IndexItem & { embedding: number[] })[];

    if (successfullyVectorized.length > 0) {
      try {
        successfullyVectorized.forEach((item) => vectorIndex!.add(item));

        if (
          streamingSession.totalProcessed % (streamingSession.batchSize * 3) ===
          0
        ) {
          await vectorIndex!.saveIndex("indexedDB");
          console.debug(
            `Saved streaming index at ${streamingSession.totalProcessed} processed items`,
          );
        }
      } catch (e) {
        console.error("Error processing streaming batch:", e);
      }
    }

    streamingSession.totalProcessed += batchToProcess.length;

    self.postMessage({
      type: "streamingProgress",
      data: {
        processed: streamingSession.totalProcessed,
        total: streamingSession.totalExpected,
        message: `Processed ${streamingSession.totalProcessed}/${streamingSession.totalExpected} items`,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  streamingSession.processingPromise = null;

  if (
    streamingSession.totalReceived >= streamingSession.totalExpected &&
    streamingSession.pendingItems.length === 0
  ) {
    await finalizeStreamingSession();
  }
}

async function finalizeStreamingSession() {
  if (!streamingSession?.isActive) {
    return;
  }

  try {
    if (vectorIndex) {
      await vectorIndex.saveIndex("indexedDB");
      console.debug("Final save of streaming index completed");
    }
  } catch (e) {
    console.error("Error in final streaming save:", e);
  }

  const totalProcessed = streamingSession.totalProcessed;
  const totalExpected = streamingSession.totalExpected;

  streamingSession.isActive = false;

  self.postMessage({
    type: "progress",
    data: {
      status: "complete",
      total: totalExpected,
      processed: totalProcessed,
      message: `Streaming vectorization complete: ${totalProcessed}/${totalExpected} items processed`,
    },
  });

  console.debug(
    `Streaming session completed: ${totalProcessed}/${totalExpected} items processed`,
  );
}

async function endStreamingSession() {
  if (!streamingSession?.isActive) {
    return;
  }

  console.debug("Ending streaming session...");

  if (streamingSession.processingPromise) {
    await streamingSession.processingPromise;
  }

  if (streamingSession.pendingItems.length > 0) {
    console.debug(
      `Processing ${streamingSession.pendingItems.length} remaining items before ending session`,
    );
    streamingSession.processingPromise = processStreamingItems();
    await streamingSession.processingPromise;
  }

  try {
    if (vectorIndex) {
      await vectorIndex.saveIndex("indexedDB");
      console.debug("Final save before ending streaming session");
    }
  } catch (e) {
    console.error("Error in final save before ending session:", e);
  }

  const wasActive = streamingSession.isActive;
  streamingSession.isActive = false;

  if (wasActive) {
    self.postMessage({
      type: "progress",
      data: {
        status: "cancelled",
        message: "Streaming session ended early",
      },
    });
  }
}

async function processItems(items: IndexItem[], signal: AbortSignal) {
  console.debug("Worker received process request.");

  if (!vectorIndex) {
    console.warn(
      "Processing requested but vector index not ready. Attempting init.",
    );
    await initWorker();
    if (!vectorIndex) {
      self.postMessage({
        type: "progress",
        data: {
          status: "error",
          message:
            "Vector index not available for processing after init attempt.",
        },
      });
      return;
    }
  }

  const unprocessedItems = items.filter((item) => {
    if (signal.aborted) return false;
    try {
      return !vectorIndex!.get({ id: item.id });
    } catch (e) {
      return true;
    }
  });

  if (signal.aborted) {
    console.debug("Processing cancelled before starting.");
    self.postMessage({
      type: "progress",
      data: {
        status: "cancelled",
        message: "Processing cancelled before start",
      },
    });
    return;
  }

  if (unprocessedItems.length === 0) {
    console.debug("No new items to process.");
    self.postMessage({
      type: "progress",
      data: { status: "complete", message: "No new items to process" },
    });
    return;
  }

  console.debug(`Starting processing of ${unprocessedItems.length} items.`);
  self.postMessage({
    type: "progress",
    data: {
      status: "started",
      total: unprocessedItems.length,
      processed: 0,
    },
  });

  const BATCH_SIZE = 5;
  let processedCount = 0;
  for (let i = 0; i < unprocessedItems.length; i += BATCH_SIZE) {
    if (signal.aborted) {
      console.debug("Processing cancelled during batching.");
      self.postMessage({
        type: "progress",
        data: {
          status: "cancelled",
          message: "Processing cancelled during batching",
        },
      });
      return;
    }

    const batch = unprocessedItems.slice(i, i + BATCH_SIZE);
    const vectorizationResults = await Promise.all(batch.map(vectorizeItem));
    const successfullyVectorized = vectorizationResults.filter(
      (result) => result !== null,
    ) as (IndexItem & { embedding: number[] })[];

    if (signal.aborted) {
      console.debug("Processing cancelled after vectorization batch.");
      self.postMessage({
        type: "progress",
        data: {
          status: "cancelled",
          message: "Processing cancelled after vectorization",
        },
      });
      return;
    }

    if (successfullyVectorized.length > 0) {
      try {
        successfullyVectorized.forEach((item) => vectorIndex!.add(item));
      } catch (e) {
        console.error("Error adding batch to index:", e);
        self.postMessage({
          type: "progress",
          data: { status: "error", message: `Error adding to index: ${e}` },
        });
      }
    }

    if (signal.aborted) {
      console.debug("Processing cancelled before saving batch.");
      self.postMessage({
        type: "progress",
        data: {
          status: "cancelled",
          message: "Processing cancelled before saving",
        },
      });
      return;
    }

    try {
      await vectorIndex!.saveIndex("indexedDB");
      console.debug(`Saved index after processing batch ${i / BATCH_SIZE + 1}`);
    } catch (e) {
      console.error("Error saving index batch:", e);
      self.postMessage({
        type: "progress",
        data: { status: "error", message: `Error saving index batch: ${e}` },
      });
    }

    processedCount = Math.min(i + BATCH_SIZE, unprocessedItems.length);

    self.postMessage({
      type: "progress",
      data: {
        status: "processing",
        total: unprocessedItems.length,
        processed: processedCount,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  if (!signal.aborted) {
    console.debug("Processing completed successfully.");
    self.postMessage({
      type: "progress",
      data: { status: "complete", message: "All items processed successfully" },
    });
  } else {
    console.debug("Processing completed, but was cancelled.");
  }
}

self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "init":
      await initWorker();
      self.postMessage({ type: "ready" });
      break;

    case "process":
      if (currentAbortController) {
        currentAbortController.abort();
      }
      currentAbortController = new AbortController();
      await processItems(data.items, currentAbortController.signal);
      break;

    case "startStreaming":
      await startStreamingSession(data.totalExpected, data.batchSize);
      break;

    case "streamBatch":
      await processStreamingBatch(data.items, data.isLast);
      break;

    case "endStreaming":
      await endStreamingSession();
      break;

    default:
      console.warn("Unknown message type:", type);
  }
});

initWorker()
  .then(() => {
    self.postMessage({ type: "ready" });
  })
  .catch((err) => {
    console.error("Initial worker initialization failed:", err);

    self.postMessage({ type: "ready" });
  });
