import {
  EmbeddingIndex,
  getEmbedding,
  initializeModel,
} from "embeddia";
import type { HydratedIndexItem } from "../types";

let vectorIndex: EmbeddingIndex | null = null;
let isInitialized = false;
let currentAbortController: AbortController | null = null;

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
    // Set as initialized even on error to prevent retries, but index will be null
    isInitialized = true;
    vectorIndex = null; // Ensure index is null on error
  }
}

async function vectorizeItem(
  item: HydratedIndexItem,
): Promise<(HydratedIndexItem & { embedding: number[] }) | null> {
  // Simplified for brevity - assumes embedding function doesn't need cancellation signal
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
    return null; // Return null if vectorization fails for an item
  }
}

async function processItems(items: HydratedIndexItem[], signal: AbortSignal) {
  console.debug("Worker received process request.");
  if (!vectorIndex) {
    console.warn(
      "Processing requested but vector index not ready. Attempting init.",
    );
    await initWorker(); // Attempt initialization if not ready
    if (!vectorIndex) {
      // Check again after attempt
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

  // Find items we haven't processed yet by checking against the index instance
  const unprocessedItems = items.filter((item) => {
    if (signal.aborted) return false; // Check cancellation during filtering
    try {
      return !vectorIndex!.get({ id: item.id });
    } catch (e) {
      // If get throws (e.g., item not found), it means it's unprocessed
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
    // Vectorize batch
    const vectorizationResults = await Promise.all(batch.map(vectorizeItem));
    const successfullyVectorized = vectorizationResults.filter(
      (result) => result !== null,
    ) as (HydratedIndexItem & { embedding: number[] })[];

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

    // Add successfully vectorized items to index
    if (successfullyVectorized.length > 0) {
      try {
        successfullyVectorized.forEach((item) => vectorIndex!.add(item));
      } catch (e) {
        console.error("Error adding batch to index:", e);
        self.postMessage({
          type: "progress",
          data: { status: "error", message: `Error adding to index: ${e}` },
        });
        // Decide whether to continue or stop on error
        // return; // Example: Stop processing if adding fails
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

    // Save index after processing the batch
    try {
      await vectorIndex!.saveIndex("indexedDB");
      console.debug(`Saved index after processing batch ${i / BATCH_SIZE + 1}`);
    } catch (e) {
      console.error("Error saving index batch:", e);
      self.postMessage({
        type: "progress",
        data: { status: "error", message: `Error saving index batch: ${e}` },
      });
      // Continue processing next batch even if saving failed? Or stop?
      // return; // Example: Stop if saving fails
    }

    processedCount = Math.min(i + BATCH_SIZE, unprocessedItems.length);

    // Report progress
    self.postMessage({
      type: "progress",
      data: {
        status: "processing",
        total: unprocessedItems.length,
        processed: processedCount,
      },
    });

    // Yield control briefly to allow other messages (like cancellation) to be processed
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
    // No need to send 'cancelled' again if already sent during batching
    // self.postMessage({ type: 'progress', data: { status: 'cancelled', message: 'Processing finished but was cancelled' }});
  }
}

async function search(
  query: string,
  topK: number,
  signal: AbortSignal,
  messageId: string,
) {
  console.debug(
    `Worker received search request (ID: ${messageId}): "${query}"`,
  );
  if (!vectorIndex) {
    console.warn(
      `Search (ID: ${messageId}) requested but vector index not ready. Attempting init.`,
    );
    await initWorker(); // Attempt initialization
    // Re-check after waiting/init attempt
    if (!vectorIndex) {
      console.error(
        `Search (ID: ${messageId}) failed: Vector index unavailable after init attempt.`,
      );
      self.postMessage({
        type: "searchError",
        data: { messageId, error: "Vector index not available." },
      });
      return;
    }
    console.debug(
      `Vector index ready after init for search (ID: ${messageId}).`,
    );
  }

  if (signal.aborted) {
    console.debug(`Search (ID: ${messageId}) cancelled before starting.`);
    self.postMessage({ type: "searchCancelled", data: { messageId } });
    return;
  }

  try {
    console.debug(`Getting embedding for query (ID: ${messageId})...`);
    const queryEmbedding = await getEmbedding(query);

    if (signal.aborted) {
      console.debug(`Search (ID: ${messageId}) cancelled after embedding.`);
      self.postMessage({ type: "searchCancelled", data: { messageId } });
      return;
    }

    console.debug(`Performing vector search (ID: ${messageId})...`);
    // Await the search and let TypeScript infer the type
    const results = await vectorIndex!.search(queryEmbedding, {
      topK,
      useStorage: "indexedDB", // Ensure we search the stored index
    });

    console.debug(
      `Vector search (ID: ${messageId}) completed with ${results.length} results.`,
    );

    if (signal.aborted) {
      console.debug(
        `Search (ID: ${messageId}) cancelled after search completed, discarding results.`,
      );
      self.postMessage({ type: "searchCancelled", data: { messageId } });
      return;
    }

    // Post results back to the main thread
    self.postMessage({ type: "searchResults", data: { messageId, results } });
  } catch (error) {
    console.error(`Vector search error in worker (ID: ${messageId}):`, error);
    // Ensure signal isn't checked *after* an error occurred before posting error message
    if (!signal.aborted) {
      // Only post error if not cancelled
      self.postMessage({
        type: "searchError",
        data: {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    } else {
      console.debug(
        `Search (ID: ${messageId}) encountered error but was cancelled, suppressing error message.`,
      );
      self.postMessage({ type: "searchCancelled", data: { messageId } }); // Still notify of cancellation
    }
  }
}

// Handle messages from the main thread
self.addEventListener("message", async (e) => {
  // Make sure data and type exist
  if (!e.data || !e.data.type) {
    console.warn("Worker received message with no data or type.");
    return;
  }

  const { type, data, messageId } = e.data; // messageId used for requests needing response/cancellation tracking

  // Cancel previous long-running operation (process or search) if a new one starts
  if (type === "process" || type === "search") {
    if (currentAbortController) {
      console.debug(
        `Worker cancelling previous operation due to new '${type}' request.`,
      );
      currentAbortController.abort(`New '${type}' operation requested`);
    }
    currentAbortController = new AbortController();
    console.debug(`Worker starting new '${type}' operation.`);
  }

  // Use the signal from the *current* controller for the task being started
  const signal = currentAbortController?.signal;

  switch (type) {
    case "process":
      if (signal && data?.items) {
        await processItems(data.items, signal);
      } else if (!signal) {
        console.error(
          "Process message received but no abort signal available.",
        );
      } else if (!data?.items) {
        console.error("Process message received without 'items' data.");
        self.postMessage({
          type: "progress",
          data: {
            status: "error",
            message: "Process command received without items.",
          },
        });
      }
      break;

    case "search":
      if (signal && messageId && typeof data?.query === "string") {
        await search(data.query, data.topK ?? 10, signal, messageId);
      } else {
        const errorReason = !signal
          ? "Missing signal"
          : !messageId
            ? "Missing messageId"
            : "Missing or invalid query";
        console.error(`Search message received invalid: ${errorReason}.`, {
          data,
          messageId,
          signalExists: !!signal,
        });
        // Send an error back if messageId exists
        if (messageId) {
          self.postMessage({
            type: "searchError",
            data: { messageId, error: `Worker internal error: ${errorReason}` },
          });
        }
      }
      break;

    case "init":
      // Init should not be cancellable in the same way, it's foundational
      // Check if already initialized before potentially running it again
      if (!isInitialized) {
        await initWorker();
        self.postMessage({ type: "ready" }); // Signal ready *after* init attempt
      } else {
        console.debug("Received init message, but worker already initialized.");
        self.postMessage({ type: "ready" }); // Signal ready anyway
      }
      break;

    // No explicit 'cancel' case needed as new tasks auto-cancel previous ones

    default:
      console.warn("Unknown message type received by vector worker:", type);
  }
});

// Initial check or trigger for initialization when the worker starts
initWorker()
  .then(() => {
    self.postMessage({ type: "ready" });
  })
  .catch((err) => {
    console.error("Initial worker initialization failed:", err);
    // Still need to signal readiness, perhaps with an error state?
    // Or rely on the first 'process' or 'search' to retry init.
    // For now, just signal ready, but the index might be null.
    self.postMessage({ type: "ready" });
  });
