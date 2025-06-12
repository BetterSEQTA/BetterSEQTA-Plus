import type { Job, IndexItem } from "../types";
import { htmlToPlainText } from "../utils";
import { delay } from "@/seqta/utils/delay";
import { VectorWorkerManager } from "../worker/vectorWorkerManager";
import { loadDynamicItems } from "../../utils/dynamicItems";
import { loadAllStoredItems } from "../indexer";
import { renderComponentMap } from "../renderComponents";
import { jobs } from "../jobs";

const RATE_LIMIT_CONFIG = {
  minDelay: 30,
  maxDelay: 3000,
  baseDelay: 150,
  backoffMultiplier: 1.3,
  maxRetries: 3,
  adaptiveBatchSize: true,
  minBatchSize: 15,
  maxBatchSize: 150,
  baseBatchSize: 75,
  vectorBatchSize: 10,
  parallelRequests: 8,
  parallelDelay: 50,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 30000,
};

interface MessagesProgress {
  offset: number;
  done: boolean;
  currentBatchSize: number;
  currentDelay: number;
  failedRequests: number;
  lastSuccessTime: number;
  retryQueue: number[];
  processedIds: string[];
  streamingStarted: boolean;
  totalEstimated: number;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenTime: number;
  consecutiveFailures: number;
}

const fetchMessages = async (offset = 0, limit = 100) => {
  const res = await fetch(`${location.origin}/seqta/student/load/message`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      searchValue: "",
      sortBy: "date",
      sortOrder: "desc",
      action: "list",
      label: "inbox",
      offset,
      limit,
      datetimeUntil: null,
    }),
  });
  return res.json() as Promise<{
    payload: { hasMore: boolean; messages: any[]; ts: string };
    status: string;
  }>;
};

export const fetchMessageContent = async (
  id: number,
  retryCount = 0,
): Promise<{
  payload: { contents: string };
  status: string;
} | null> => {
  try {
    const res = await fetch(`${location.origin}/seqta/student/load/message`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ action: "message", id }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (error) {
    console.warn(
      `[Messages job] Failed to fetch content for message ${id} (attempt ${retryCount + 1}):`,
      error,
    );

    if (retryCount < RATE_LIMIT_CONFIG.maxRetries) {
      const retryDelay =
        RATE_LIMIT_CONFIG.baseDelay *
        Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, retryCount);
      await delay(Math.min(retryDelay, RATE_LIMIT_CONFIG.maxDelay));
      return fetchMessageContent(id, retryCount + 1);
    }

    return null;
  }
};

function calculateAdaptiveDelay(
  progress: MessagesProgress,
  responseTime: number,
): number {
  const {
    currentDelay,
    failedRequests,
    lastSuccessTime,
    circuitBreakerOpen,
    consecutiveFailures,
  } = progress;
  const timeSinceLastSuccess = Date.now() - lastSuccessTime;

  if (circuitBreakerOpen) {
    return RATE_LIMIT_CONFIG.maxDelay;
  }

  if (consecutiveFailures > 2 || failedRequests > 3 || responseTime > 3000) {
    return Math.min(
      currentDelay *
        (RATE_LIMIT_CONFIG.backoffMultiplier + consecutiveFailures * 0.2),
      RATE_LIMIT_CONFIG.maxDelay,
    );
  }

  if (
    responseTime < 300 &&
    timeSinceLastSuccess > 5000 &&
    consecutiveFailures === 0
  ) {
    return Math.max(currentDelay * 0.7, RATE_LIMIT_CONFIG.minDelay);
  }

  return currentDelay;
}

async function estimateMessageCount(): Promise<number> {
  try {
    const firstBatch = await fetchMessages(0, 100);
    if (firstBatch.status !== "200" || !firstBatch.payload.hasMore) {
      return firstBatch.payload.messages.length;
    }

    return Math.min(firstBatch.payload.messages.length * 20, 2000);
  } catch (error) {
    console.warn("[Messages job] Failed to estimate message count:", error);
    return 500;
  }
}

function calculateAdaptiveBatchSize(
  progress: MessagesProgress,
  responseTime: number,
): number {
  if (!RATE_LIMIT_CONFIG.adaptiveBatchSize) {
    return progress.currentBatchSize;
  }

  const {
    currentBatchSize,
    failedRequests,
    circuitBreakerOpen,
    consecutiveFailures,
  } = progress;

  if (circuitBreakerOpen) {
    return RATE_LIMIT_CONFIG.minBatchSize;
  }

  if (consecutiveFailures > 1 || failedRequests > 2 || responseTime > 2500) {
    return Math.max(
      Math.floor(currentBatchSize * 0.6),
      RATE_LIMIT_CONFIG.minBatchSize,
    );
  }

  if (failedRequests === 0 && responseTime < 800 && consecutiveFailures === 0) {
    return Math.min(
      Math.floor(currentBatchSize * 1.4),
      RATE_LIMIT_CONFIG.maxBatchSize,
    );
  }

  return currentBatchSize;
}

function checkCircuitBreaker(progress: MessagesProgress): boolean {
  const now = Date.now();

  if (
    !progress.circuitBreakerOpen &&
    progress.consecutiveFailures >= RATE_LIMIT_CONFIG.circuitBreakerThreshold
  ) {
    progress.circuitBreakerOpen = true;
    progress.circuitBreakerOpenTime = now;
    console.warn(
      `[Messages job] Circuit breaker opened due to ${progress.consecutiveFailures} consecutive failures`,
    );
    return true;
  }

  if (
    progress.circuitBreakerOpen &&
    now - progress.circuitBreakerOpenTime >
      RATE_LIMIT_CONFIG.circuitBreakerResetTime
  ) {
    progress.circuitBreakerOpen = false;
    progress.consecutiveFailures = 0;
    console.info(
      `[Messages job] Circuit breaker closed after ${RATE_LIMIT_CONFIG.circuitBreakerResetTime}ms`,
    );
    return false;
  }

  return progress.circuitBreakerOpen;
}

async function processMessagesInParallel(
  messages: any[],
  existingIds: Set<string>,
  processedIdsSet: Set<string>,
  progress: MessagesProgress,
  ctx: any,
): Promise<{
  processedItems: IndexItem[];
  consecutiveExisting: number;
  updatedProgress: MessagesProgress;
  shouldStop: boolean;
}> {
  const processedItems: IndexItem[] = [];
  let consecutiveExisting = 0;
  const updatedProgress = { ...progress };

  const twoYearsAgo = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
  let shouldStop = false;

  const messagesToProcess = messages.filter((msg) => {
    const id = msg.id.toString();
    const messageDate = new Date(msg.date).getTime();

    if (messageDate < twoYearsAgo) {
      //! older than 2 years ago
      shouldStop = true;
      return false;
    }

    if (existingIds.has(id) || processedIdsSet.has(id)) {
      consecutiveExisting++;
      return false;
    }
    consecutiveExisting = 0;
    return true;
  });

  if (messagesToProcess.length === 0) {
    return { processedItems, consecutiveExisting, updatedProgress, shouldStop };
  }

  for (
    let i = 0;
    i < messagesToProcess.length;
    i += RATE_LIMIT_CONFIG.parallelRequests
  ) {
    const batch = messagesToProcess.slice(
      i,
      i + RATE_LIMIT_CONFIG.parallelRequests,
    );

    if (i > 0) {
      await delay(
        Math.max(updatedProgress.currentDelay, RATE_LIMIT_CONFIG.parallelDelay),
      );
    }

    const batchStartTime = Date.now();

    const batchPromises = batch.map(async (msg) => {
      const id = msg.id.toString();

      try {
        const full = await fetchMessageContent(msg.id);
        const responseTime = Date.now() - batchStartTime;

        if (full && full.status === "200") {
          const item: IndexItem = {
            id,
            text: msg.subject,
            category: "messages",
            content: `${htmlToPlainText(full.payload.contents)}\nFrom: ${msg.sender}`,
            dateAdded: new Date(msg.date).getTime(),
            metadata: {
              messageId: msg.id,
              author: msg.sender,
              senderId: msg.sender_id,
              senderType: msg.sender_type,
              timestamp: msg.date,
              hasAttachments: msg.attachments,
              attachmentCount: msg.attachmentCount,
              read: msg.read === 1,
            },
            actionId: "message",
            renderComponentId: "message",
          };

          return { success: true, item, id, responseTime };
        } else {
          return { success: false, id, messageId: msg.id, responseTime };
        }
      } catch (error) {
        console.error(`[Messages job] content fetch failed (id ${id}):`, error);
        return { success: false, id, messageId: msg.id, error };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    const batchResponseTime = Date.now() - batchStartTime;

    let batchSuccesses = 0;
    let batchFailures = 0;

    for (const result of batchResults) {
      if (result.success && result.item) {
        await ctx.addItem(result.item);
        existingIds.add(result.id);
        processedIdsSet.add(result.id);
        processedItems.push(result.item);
        batchSuccesses++;
      } else {
        if (updatedProgress.retryQueue.length < 50 && result.messageId) {
          updatedProgress.retryQueue.push(result.messageId);
        }
        batchFailures++;
      }
    }

    if (batchSuccesses > 0) {
      updatedProgress.lastSuccessTime = Date.now();
      updatedProgress.failedRequests = Math.max(
        0,
        updatedProgress.failedRequests - batchSuccesses,
      );
    }

    if (batchFailures > 0) {
      updatedProgress.failedRequests += batchFailures;
    }

    updatedProgress.currentDelay = calculateAdaptiveDelay(
      updatedProgress,
      batchResponseTime,
    );

    console.log(
      `[Messages job] Processed parallel batch: ${batchSuccesses} successes, ${batchFailures} failures, ${batchResponseTime}ms total time`,
    );
  }

  return { processedItems, consecutiveExisting, updatedProgress, shouldStop };
}

export const messagesJob: Job = {
  id: "messages",
  label: "Messages",
  renderComponentId: "message",
  frequency: { type: "expiry", afterMs: 1000 * 60 * 60 * 24 },

  run: async (ctx) => {
    const progress = (await ctx.getProgress<MessagesProgress>()) ?? {
      offset: 0,
      done: false,
      currentBatchSize: RATE_LIMIT_CONFIG.baseBatchSize,
      currentDelay: RATE_LIMIT_CONFIG.baseDelay,
      failedRequests: 0,
      lastSuccessTime: Date.now(),
      retryQueue: [],
      processedIds: [],
      streamingStarted: false,
      totalEstimated: 0,
      circuitBreakerOpen: false,
      circuitBreakerOpenTime: 0,
      consecutiveFailures: 0,
    };

    const existingIds = new Set((await ctx.getStoredItems()).map((i) => i.id));

    const processedIdsSet = new Set(progress.processedIds);

    existingIds.forEach((id) => processedIdsSet.add(id));

    const vectorWorker = VectorWorkerManager.getInstance();
    if (!progress.streamingStarted) {
      progress.totalEstimated = await estimateMessageCount();

      try {
        await vectorWorker.startStreamingSession(
          progress.totalEstimated,
          (progressData) => {
            console.log(
              `[Messages job] Vector streaming progress: ${progressData.processed}/${progressData.total} (${progressData.status})`,
            );
          },
          RATE_LIMIT_CONFIG.vectorBatchSize,
          "messages",
        );
        progress.streamingStarted = true;
        console.log(
          `[Messages job] Started streaming vectorization session for ~${progress.totalEstimated} items`,
        );
      } catch (error) {
        console.warn(
          "[Messages job] Failed to start streaming session:",
          error,
        );
      }
    }

    let consecutiveExisting = 0;
    let requestStartTime = 0;
    let progressUpdateCounter = 0;
    let itemsStreamedToVector = 0;

    if (progress.retryQueue.length > 0) {
      console.log(
        `[Messages job] Processing ${Math.min(progress.retryQueue.length, 10)} items from retry queue`,
      );

      const retryBatch = progress.retryQueue.slice(0, 10);
      const retryBatches = [];

      for (
        let i = 0;
        i < retryBatch.length;
        i += RATE_LIMIT_CONFIG.parallelRequests
      ) {
        retryBatches.push(
          retryBatch.slice(i, i + RATE_LIMIT_CONFIG.parallelRequests),
        );
      }

      for (const batch of retryBatches) {
        await delay(progress.currentDelay);
        const batchStartTime = Date.now();

        const retryPromises = batch.map(async (messageId) => {
          const id = messageId.toString();

          if (processedIdsSet.has(id)) {
            return { success: true, messageId, alreadyProcessed: true };
          }

          try {
            const full = await fetchMessageContent(messageId);
            const responseTime = Date.now() - batchStartTime;

            if (full && full.status === "200") {
              return { success: true, messageId, responseTime };
            } else {
              return { success: false, messageId, responseTime };
            }
          } catch (error) {
            console.error(
              `[Messages job] Retry failed for message ${messageId}:`,
              error,
            );
            return { success: false, messageId, error };
          }
        });

        const retryResults = await Promise.all(retryPromises);
        const batchResponseTime = Date.now() - batchStartTime;

        let retrySuccesses = 0;
        let retryFailures = 0;

        for (const result of retryResults) {
          if (result.success) {
            if (!result.alreadyProcessed) {
              processedIdsSet.add(result.messageId.toString());
              retrySuccesses++;
            }
            progress.retryQueue = progress.retryQueue.filter(
              (mid) => mid !== result.messageId,
            );
          } else {
            retryFailures++;
          }
        }

        if (retrySuccesses > 0) {
          progress.lastSuccessTime = Date.now();
          progress.failedRequests = Math.max(
            0,
            progress.failedRequests - retrySuccesses,
          );
        }

        if (retryFailures > 0) {
          progress.failedRequests += retryFailures;
        }

        progress.currentDelay = calculateAdaptiveDelay(
          progress,
          batchResponseTime,
        );

        console.log(
          `[Messages job] Processed retry batch: ${retrySuccesses} successes, ${retryFailures} failures`,
        );
      }
    }

    while (!progress.done) {
      if (checkCircuitBreaker(progress)) {
        console.warn(
          "[Messages job] Circuit breaker is open, skipping processing",
        );
        await delay(RATE_LIMIT_CONFIG.maxDelay);
        continue;
      }

      await delay(progress.currentDelay);
      requestStartTime = Date.now();

      let list;
      try {
        list = await fetchMessages(progress.offset, progress.currentBatchSize);
        const responseTime = Date.now() - requestStartTime;

        progress.consecutiveFailures = 0;

        progress.currentDelay = calculateAdaptiveDelay(progress, responseTime);
        progress.currentBatchSize = calculateAdaptiveBatchSize(
          progress,
          responseTime,
        );
      } catch (e) {
        console.error("[Messages job] list fetch failed:", e);
        progress.failedRequests++;
        progress.consecutiveFailures++;
        progress.currentDelay = Math.min(
          progress.currentDelay * RATE_LIMIT_CONFIG.backoffMultiplier,
          RATE_LIMIT_CONFIG.maxDelay,
        );

        progress.processedIds = Array.from(processedIdsSet);
        await ctx.setProgress(progress);
        break;
      }

      if (list.status !== "200") {
        progress.failedRequests++;
        progress.consecutiveFailures++;

        progress.processedIds = Array.from(processedIdsSet);
        await ctx.setProgress(progress);
        break;
      }

      const itemsToStream: IndexItem[] = [];

      const {
        processedItems,
        consecutiveExisting: newConsecutiveExisting,
        updatedProgress,
        shouldStop,
      } = await processMessagesInParallel(
        list.payload.messages,
        existingIds,
        processedIdsSet,
        progress,
        ctx,
      );

      progress.currentDelay = updatedProgress.currentDelay;
      progress.failedRequests = updatedProgress.failedRequests;
      progress.lastSuccessTime = updatedProgress.lastSuccessTime;
      progress.retryQueue = updatedProgress.retryQueue;

      itemsToStream.push(...processedItems);

      consecutiveExisting = newConsecutiveExisting;
      if (consecutiveExisting >= 20) {
        progress.done = true;
      }

      // Stream items to vector worker if we have any
      if (itemsToStream.length > 0 && progress.streamingStarted) {
        try {
          await vectorWorker.streamItems(itemsToStream);
          itemsStreamedToVector += itemsToStream.length;
          console.log(
            `[Messages job] Streamed ${itemsToStream.length} items to vector worker (total: ${itemsStreamedToVector})`,
          );
        } catch (error) {
          console.warn(
            "[Messages job] Failed to stream items to vector worker:",
            error,
          );
        }
      }

      if (processedItems.length > 0) {
        try {
          const currentItems = await loadAllStoredItems();
          currentItems.forEach((item) => {
            const jobDef =
              jobs[item.category] ||
              Object.values(jobs).find((j) => j.id === item.category) ||
              jobs[item.renderComponentId];
            if (jobDef) {
              const renderComponent =
                renderComponentMap[jobDef.renderComponentId];
              if (renderComponent) {
                item.renderComponent = renderComponent;
              }
            } else if (renderComponentMap[item.renderComponentId]) {
              item.renderComponent = renderComponentMap[item.renderComponentId];
            }
          });
          loadDynamicItems(currentItems);
          window.dispatchEvent(
            new CustomEvent("dynamic-items-updated", {
              detail: {
                incremental: true,
                jobId: "messages",
                newItemCount: processedItems.length,
                streaming: true,
              },
            }),
          );
        } catch (error) {
          console.warn(
            "[Messages job] Failed to dispatch incremental search update:",
            error,
          );
        }
      }

      if (!list.payload.hasMore) progress.done = true;
      progress.offset += progress.currentBatchSize;

      progressUpdateCounter++;
      if (progressUpdateCounter >= 10 || progress.done) {
        progress.processedIds = Array.from(processedIdsSet);
        await ctx.setProgress(progress);
        progressUpdateCounter = 0;

        console.log(
          `[Messages job] Progress: offset=${progress.offset}, batchSize=${progress.currentBatchSize}, delay=${progress.currentDelay}ms, failures=${progress.failedRequests}, retryQueue=${progress.retryQueue.length}, vectorStreamed=${itemsStreamedToVector}, parallelRequests=${RATE_LIMIT_CONFIG.parallelRequests}`,
        );
      }

      if (shouldStop) {
        progress.done = true;
        break;
      }
    }

    if (progress.streamingStarted) {
      try {
        await vectorWorker.endStreamingSession();
        console.log(
          `[Messages job] Ended streaming session. Total items streamed: ${itemsStreamedToVector}`,
        );
      } catch (error) {
        console.warn("[Messages job] Failed to end streaming session:", error);
      }
    }

    if (progress.done) {
      await ctx.setProgress({
        offset: 0,
        done: false,
        currentBatchSize: RATE_LIMIT_CONFIG.baseBatchSize,
        currentDelay: RATE_LIMIT_CONFIG.baseDelay,
        failedRequests: 0,
        lastSuccessTime: Date.now(),
        retryQueue: progress.retryQueue.slice(0, 20),
        processedIds: [],
        streamingStarted: false,
        totalEstimated: 0,
        circuitBreakerOpen: false,
        circuitBreakerOpenTime: 0,
        consecutiveFailures: 0,
      });
    } else {
      progress.processedIds = Array.from(processedIdsSet);
      await ctx.setProgress(progress);
    }

    return [];
  },

  purge: (items) => {
    const twoYears = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000;
    return items.filter((i) => i.dateAdded >= twoYears);
  },
};
