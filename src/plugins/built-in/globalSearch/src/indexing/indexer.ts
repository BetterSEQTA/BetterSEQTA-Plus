import { clear, getAll, get, put, remove } from "./db";
import { jobs } from "./jobs";
import { renderComponentMap } from "./renderComponents";
import type { IndexItem, Job, JobContext } from "./types";
import { VectorWorkerManager } from "./worker/vectorWorkerManager";
import { loadDynamicItems } from "../utils/dynamicItems";
import { getVectorizedItemIds } from "./utils";

const META_STORE = "meta";
const LOCK_KEY = "bsq-indexer-lock";
const HEARTBEAT_INTERVAL = 10000;
const LOCK_TIMEOUT = 20000;
const LOCK_ACQUIRE_TIMEOUT = 5000;

/* ─────────── Progress‑meta helpers ─────────── */
async function loadProgress<T = any>(jobId: string): Promise<T | undefined> {
  const rec = await get(META_STORE, `progress:${jobId}`);
  return rec?.progress as T | undefined;
}

async function saveProgress<T = any>(jobId: string, progress: T): Promise<void> {
  await put(META_STORE, { progress }, `progress:${jobId}`);
}
/* ───────────────────────────────────────────── */

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let isIndexingActive = false;

function shouldRun(job: Job, lastRun?: number): boolean {
  const now = Date.now();

  if (job.frequency === "pageLoad") return true;
  if (!lastRun) return true;

  if (job.frequency.type === "interval") {
    return now - lastRun >= job.frequency.ms;
  }

  if (job.frequency.type === "expiry") {
    return now - lastRun >= job.frequency.afterMs;
  }

  return false;
}

function getLastRunMeta(jobId: string): Promise<number | undefined> {
  return getAll(META_STORE).then((metaItems) => {
    const match = metaItems.find((m: any) => m.jobId === jobId);
    return match?.lastRun;
  });
}

async function updateLastRunMeta(jobId: string): Promise<void> {
  await put(META_STORE, { jobId, lastRun: Date.now() }, jobId);
}

async function acquireLock(): Promise<boolean> {
  if (isIndexingActive) {
    console.debug("[Indexer] Already indexing in this tab");
    return false;
  }

  const lockId = `${Date.now()}-${Math.random()}`;
  const startTime = Date.now();
  
  while (Date.now() - startTime < LOCK_ACQUIRE_TIMEOUT) {
    const currentLock = localStorage.getItem(LOCK_KEY);
    const currentTime = Date.now();
    
    if (!currentLock) {
      localStorage.setItem(LOCK_KEY, lockId);
      await new Promise(resolve => setTimeout(resolve, 50));
      if (localStorage.getItem(LOCK_KEY) === lockId) {
        isIndexingActive = true;
        return true;
      }
    } else {
      try {
        const [timestamp] = currentLock.split('-');
        const lockTime = parseInt(timestamp, 10);
        if (isNaN(lockTime) || currentTime - lockTime > LOCK_TIMEOUT) {
          localStorage.setItem(LOCK_KEY, lockId);
          await new Promise(resolve => setTimeout(resolve, 50));
          if (localStorage.getItem(LOCK_KEY) === lockId) {
            isIndexingActive = true;
            return true;
          }
        }
      } catch (e) {
        console.warn("[Indexer] Error parsing lock:", e);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return false;
}

function startHeartbeat() {
  const lockId = localStorage.getItem(LOCK_KEY);
  if (!lockId) return;
  
  heartbeatTimer = setInterval(() => {
    if (localStorage.getItem(LOCK_KEY)?.endsWith(lockId.split('-')[1])) {
      const newLockId = `${Date.now()}-${lockId.split('-')[1]}`;
      localStorage.setItem(LOCK_KEY, newLockId);
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  localStorage.removeItem(LOCK_KEY);
  isIndexingActive = false;
}

function dispatchProgress(
  completed: number,
  total: number,
  indexing: boolean,
  status?: string,
  detail?: string,
) {
  const event = new CustomEvent("indexing-progress", {
    detail: { completed, total, indexing, status, detail },
  });
  window.dispatchEvent(event);
}

export async function loadAllStoredItems(): Promise<IndexItem[]> {
  const all: IndexItem[] = [];
  const jobIds = Object.keys(jobs);

  for (const jobId of jobIds) {
    try {
      const items = (await getAll(jobId)) as IndexItem[];
      const job = jobs[jobId];

      for (const item of items) {
        if (
          item &&
          item.id &&
          item.text &&
          item.category &&
          item.actionId &&
          job.renderComponentId // job might not be defined if store exists but job was removed
        ) {
          all.push(item);
        } else {
          console.warn(`Skipping invalid item from job store ${jobId}:`, item);
        }
      }
    } catch (error) {
      console.error(`Error loading items for job store ${jobId}:`, error);
    }
  }
  console.debug(
    `[Indexer] Loaded ${all.length} items from all primary stores.`,
  );
  return all;
}

export async function runIndexing(): Promise<void> {
  if (!(await acquireLock())) {
    console.debug(
      "%c[Indexer] Could not acquire lock - another tab is indexing or this tab is already indexing",
      "color: gray",
    );
    return;
  }

  startHeartbeat();
  console.debug("%c[Indexer] Starting indexing...", "color: green");

  const jobIds = Object.keys(jobs);
  let completedJobs = 0;
  const totalSteps = jobIds.length + 1;
  dispatchProgress(completedJobs, totalSteps, true, "Starting jobs");

  let hasStreamingJobs = false;

  for (const jobId of jobIds) {
    dispatchProgress(
      completedJobs,
      totalSteps,
      true,
      `Running job: ${jobs[jobId].label}`,
    );
    const job = jobs[jobId];
    const lastRun = await getLastRunMeta(jobId);

    if (!shouldRun(job, lastRun)) {
      console.debug(
        `%c[Indexer] Skipping job "${jobId}" (not due)`,
        "color: gray",
      );
      completedJobs++;
      dispatchProgress(
        completedJobs,
        totalSteps,
        true,
        `Skipped job: ${job.label}`,
      );
      continue;
    }

    const getStoredItems = async (storeId?: string) =>
      await getAll(storeId ?? jobId);
    const setStoredItems = async (items: IndexItem[], storeId?: string) => {
      const targetStore = storeId ?? jobId;
      await clear(targetStore);
      const validItems = items.filter((i) => i && i.id);
      if (validItems.length !== items.length) {
        console.warn(
          `[Indexer Job ${jobId} -> Store ${targetStore}] Filtered out ${items.length - validItems.length} invalid items before storing.`,
        );
      }
      await Promise.all(validItems.map((i) => put(targetStore, i, i.id)));
    };
    const addItem = async (item: IndexItem, storeId?: string) => {
      const targetStore = storeId ?? jobId;
      if (item && item.id) {
        await put(targetStore, item, item.id);
      } else {
        console.warn(
          `[Indexer Job ${jobId} -> Store ${targetStore}] Attempted to add invalid item:`,
          item,
        );
      }
    };
    const removeItem = async (id: string, storeId?: string) => {
      const targetStore = storeId ?? jobId;
      await remove(targetStore, id);
    };

    const ctx: JobContext = {
      getStoredItems,
      setStoredItems,
      addItem,
      removeItem,
      getProgress: () => loadProgress(jobId),
      setProgress: (p) => saveProgress(jobId, p),
    };

    console.debug(`%c[Indexer] Running job "${jobId}"...`, "color: #4ea1ff");

    try {
      const newItemsRaw = await job.run(ctx);
      const stored = await getStoredItems();

      let merged = mergeItems(stored, newItemsRaw);
      if (job.purge) merged = job.purge(merged);
      
      await setStoredItems(merged);
      await updateLastRunMeta(jobId);

      if (jobId === 'messages' || jobId === 'notifications') {
        hasStreamingJobs = true;
      }

      console.debug(
        `%c[Indexer] ${job.label}: ${newItemsRaw.length} new items reported by run, ${merged.length} total items now in '${jobId}' store.`,
        "color: #00c46f",
      );
    } catch (err) {
      console.debug(`%c[Indexer] Job ${job.label} failed:`, "color: red");
      console.error(err);
    }

    completedJobs++;
    dispatchProgress(
      completedJobs,
      totalSteps,
      true,
      `Finished job: ${job.label}`,
    );
  }

  let allItemsInPrimaryStores = await loadAllStoredItems();

  if (allItemsInPrimaryStores.length > 0) {
    console.debug(
      `%c[Indexer] Checking ${allItemsInPrimaryStores.length} items for vectorization...`,
      "color: #4ea1ff",
    );
    
    // Pre-filter items to avoid initializing worker if nothing new
    const vectorizedItemIds = await getVectorizedItemIds();
    const newItemsToVectorize = allItemsInPrimaryStores.filter(item => !vectorizedItemIds.has(item.id));
    
    if (newItemsToVectorize.length > 0) {
      console.debug(
        `%c[Indexer] Sending ${newItemsToVectorize.length} new items to worker for vectorization (${allItemsInPrimaryStores.length - newItemsToVectorize.length} already vectorized)`,
        "color: #4ea1ff",
      );
      dispatchProgress(completedJobs, totalSteps, true, "Starting vectorization of new items");

      try {
        const workerManager = VectorWorkerManager.getInstance();
        await workerManager.processItems(newItemsToVectorize, (progress) => {
        let detailMessage = progress.message || "";
        if (
          progress.status === "processing" &&
          progress.total &&
          progress.processed !== undefined
        ) {
          detailMessage = `Vectorizing: ${progress.processed} / ${progress.total}`;
        } else if (progress.status === "complete") {
          detailMessage = "Vectorization complete";
          completedJobs++;
          dispatchProgress(
            completedJobs,
            totalSteps,
            false,
            "Indexing finished",
            detailMessage
          );
        } else if (progress.status === "error") {
          detailMessage = `Vectorization error: ${progress.message}`;
          dispatchProgress(
            completedJobs,
            totalSteps,
            false,
            "Vectorization failed",
            detailMessage,
          );
        } else if (progress.status === "started") {
          detailMessage = `Vectorization started for ${progress.total} items`;
        } else if (progress.status === "cancelled") {
          detailMessage = `Vectorization cancelled: ${progress.message}`;
          dispatchProgress(
            completedJobs,
            totalSteps,
            false,
            "Vectorization cancelled",
            detailMessage,
          );
        }

        if (progress.status !== "complete" && progress.status !== "error" && progress.status !== "cancelled") {
            dispatchProgress(
              completedJobs,
              totalSteps,
              true,
              "Vectorization in progress",
              detailMessage,
            );
        }
      });
      console.debug(
        "%c[Indexer] Vectorization task for stored items sent to worker.",
        "color: green",
      );
    } catch (error) {
      console.error(
        `%c[Indexer] ❌ Failed to send items to vector worker:`,
        "color: red",
        error,
      );
      dispatchProgress(
        completedJobs,
        totalSteps,
        false,
        "Vectorization failed",
        String(error),
      );
    }
    } else {
      console.debug(
        `%c[Indexer] All ${allItemsInPrimaryStores.length} items are already vectorized, skipping worker initialization.`,
        "color: gray",
      );
      completedJobs++;
      dispatchProgress(
        completedJobs,
        totalSteps,
        false,
        "Indexing finished (all items already vectorized)",
      );
    }
  } else {
    console.debug(
      "%c[Indexer] No items found in primary stores to send for vectorization.",
      "color: gray",
    );
    completedJobs++;
    dispatchProgress(
      completedJobs,
      totalSteps,
      false,
      "Indexing finished (no items for vectorization)",
    );
  }

  stopHeartbeat();

  allItemsInPrimaryStores = await loadAllStoredItems();
  allItemsInPrimaryStores.forEach(item => {
    const jobDef = jobs[item.category] || Object.values(jobs).find(j => j.id === item.category) || jobs[item.renderComponentId];
    if (jobDef) {
        const renderComponent = renderComponentMap[jobDef.renderComponentId];
        if (renderComponent) {
          item.renderComponent = renderComponent;
        }
    } else if (renderComponentMap[item.renderComponentId]) {
        item.renderComponent = renderComponentMap[item.renderComponentId];
    }
  });
  loadDynamicItems(allItemsInPrimaryStores);
  window.dispatchEvent(new Event("dynamic-items-updated"));
}

function mergeItems(existing: IndexItem[], incoming: IndexItem[]): IndexItem[] {
  const map = new Map<string, IndexItem>();
  for (const item of existing) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of incoming) {
    if (item && item.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}