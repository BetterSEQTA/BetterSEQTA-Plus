import { clear, getAll, get, put, remove } from "./db";
import { jobs } from "./jobs";
import { renderComponentMap } from "./renderComponents";
import type { IndexItem, Job, JobContext } from "./types";
import { VectorWorkerManager } from "./worker/vectorWorkerManager";
import { loadDynamicItems } from "../utils/dynamicItems";

const META_STORE = "meta";
const LOCK_KEY = "bsq-indexer-lock";
const HEARTBEAT_INTERVAL = 10000;
const LOCK_TIMEOUT = 20000;

/* ─────────── Progress‑meta helpers ─────────── */
async function loadProgress<T = any>(jobId: string): Promise<T | undefined> {
  const rec = await get(META_STORE, `progress:${jobId}`);
  return rec?.progress as T | undefined;
}

async function saveProgress<T = any>(
  jobId: string,
  progress: T,
): Promise<void> {
  await put(META_STORE, { jobId, progress }, `progress:${jobId}`);
}
/* ───────────────────────────────────────────── */

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

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

function shouldIndex(): boolean {
  const last = parseInt(localStorage.getItem(LOCK_KEY) || "0", 10);
  return isNaN(last) || Date.now() - last > LOCK_TIMEOUT;
}

function startHeartbeat() {
  localStorage.setItem(LOCK_KEY, `${Date.now()}`);
  heartbeatTimer = setInterval(() => {
    localStorage.setItem(LOCK_KEY, `${Date.now()}`);
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  localStorage.removeItem(LOCK_KEY);
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
  if (!shouldIndex()) {
    console.debug(
      "%c[Indexer] Skipping indexing (another tab has the lock)",
      "color: gray",
    );
    return;
  }

  startHeartbeat();
  console.debug("%c[Indexer] Starting indexing...", "color: green");

  const jobIds = Object.keys(jobs);
  let completedJobs = 0;
  // Add an extra step for vectorization
  const totalSteps = jobIds.length + 1;
  dispatchProgress(completedJobs, totalSteps, true, "Starting jobs");

  // --- Step 1: Run Fetching/Storing Jobs (Main Thread) ---
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
      const newItemsRaw = await job.run(ctx); // newItemsRaw are items *returned* by the job.
                                            // Some jobs (like messages) might add via ctx.addItem and return [].
      const stored = await getStoredItems();

      let merged = mergeItems(stored, newItemsRaw);
      if (job.purge) merged = job.purge(merged);
      
      await setStoredItems(merged);
      await updateLastRunMeta(jobId);

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

  // --- Step 2: Delegate Vectorization to Worker (Off Main Thread) ---
  // Load ALL items from the primary stores. The worker will handle deduplication against its own vector store.
  const allItemsInPrimaryStores = await loadAllStoredItems();

  if (allItemsInPrimaryStores.length > 0) {
    console.debug(
      `%c[Indexer] Sending ${allItemsInPrimaryStores.length} items from primary stores to worker for vectorization check...`,
      "color: #4ea1ff",
    );
    dispatchProgress(completedJobs, totalSteps, true, "Starting vectorization of stored items");

    try {
      const workerManager = VectorWorkerManager.getInstance();
      await workerManager.processItems(allItemsInPrimaryStores, (progress) => {
        let detailMessage = progress.message || "";
        if (
          progress.status === "processing" &&
          progress.total &&
          progress.processed !== undefined
        ) {
          detailMessage = `Vectorizing: ${progress.processed} / ${progress.total}`;
        } else if (progress.status === "complete") {
          detailMessage = "Vectorization complete";
          // Mark the vectorization step as complete
          completedJobs++; // Increment completion count *after* vectorization finishes
          dispatchProgress(
            completedJobs,
            totalSteps,
            false, // Indexing finished
            "Indexing finished",
            detailMessage
          );
        } else if (progress.status === "error") {
          detailMessage = `Vectorization error: ${progress.message}`;
          dispatchProgress(
            completedJobs,
            totalSteps,
            false, // Indexing stopped
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
            false, // Indexing stopped
            "Vectorization cancelled",
            detailMessage,
          );
        }

        // Update the status detail for ongoing vectorization
        if (progress.status !== "complete" && progress.status !== "error" && progress.status !== "cancelled") {
            dispatchProgress(
              completedJobs, // Still on job completion count
              totalSteps,
              true, // Indexing still active
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
        false, // Indexing stopped
        "Vectorization failed",
        String(error),
      );
    }
  } else {
    console.debug(
      "%c[Indexer] No items found in primary stores to send for vectorization.",
      "color: gray",
    );
    completedJobs++; // Count the "skipped" vectorization step
    dispatchProgress(
      completedJobs,
      totalSteps,
      false, // Indexing finished
      "Indexing finished (no items for vectorization)",
    );
  }

  stopHeartbeat();

  // Update dynamic items with everything that's now in the primary stores
  // These items are either already vectorized or will be by the worker.
  allItemsInPrimaryStores.forEach(item => {
    // Ensure job still exists for renderComponentId mapping
    const jobDef = jobs[item.category] || Object.values(jobs).find(j => j.id === item.category) || jobs[item.renderComponentId];
    if (jobDef) {
        const renderComponent = renderComponentMap[jobDef.renderComponentId];
        if (renderComponent) {
          item.renderComponent = renderComponent;
        }
    } else if (renderComponentMap[item.renderComponentId]) { // Fallback if category doesn't match a job id directly
        item.renderComponent = renderComponentMap[item.renderComponentId];
    }
  });
  loadDynamicItems(allItemsInPrimaryStores);
  window.dispatchEvent(new Event("dynamic-items-updated"));
}

function mergeItems(existing: IndexItem[], incoming: IndexItem[]): IndexItem[] {
  const map = new Map<string, IndexItem>();
  // Prioritize incoming items if IDs clash
  for (const item of existing) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of incoming) {
    if (item && item.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}