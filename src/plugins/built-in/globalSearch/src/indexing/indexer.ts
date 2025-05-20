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
          job.renderComponentId
        ) {
          all.push(item);
        } else {
          console.warn(`Skipping invalid item from job ${jobId}:`, item);
        }
      }
    } catch (error) {
      console.error(`Error loading items for job ${jobId}:`, error);
    }
  }
  console.debug(
    `[Indexer] Loaded ${all.length} items from non-vector storage.`,
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

  const allItemsFromJobs: IndexItem[] = [];

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
      const newItemsRaw = await job.run(ctx);
      const stored = await getStoredItems();

      let merged = mergeItems(stored, newItemsRaw);
      if (job.purge) merged = job.purge(merged);

      console.log(`[Indexer] ${job.label}: ${merged.length} items stored in '${jobId}' store (non-vector).`);

      await setStoredItems(merged);
      await updateLastRunMeta(jobId);

      allItemsFromJobs.push(...newItemsRaw);

      console.debug(
        `%c[Indexer] ${job.label}: ${newItemsRaw.length} new items from run, ${merged.length} total stored in '${jobId}' store (non-vector).`,
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
  if (allItemsFromJobs.length > 0) {
    console.debug(
      `%c[Indexer] Sending ${allItemsFromJobs.length} items to worker for vectorization...`,
      "color: #4ea1ff",
    );
    dispatchProgress(completedJobs, totalSteps, true, "Starting vectorization");

    try {
      const workerManager = VectorWorkerManager.getInstance();
      // Pass a progress callback to the worker manager
      await workerManager.processItems(allItemsFromJobs, (progress) => {
        // Update overall progress based on worker feedback
        let detailMessage = progress.message || "";
        if (
          progress.status === "processing" &&
          progress.total &&
          progress.processed !== undefined
        ) {
          detailMessage = `Vectorizing: ${progress.processed} / ${progress.total}`;
          // You could potentially update the 'completed' count more granularly here
          // For simplicity, we'll just update the detail message
        } else if (progress.status === "complete") {
          detailMessage = "Vectorization complete";
          // Mark the vectorization step as complete
          dispatchProgress(
            totalSteps,
            totalSteps,
            true,
            "Vectorization finished",
          );
        } else if (progress.status === "error") {
          detailMessage = `Vectorization error: ${progress.message}`;
          dispatchProgress(
            completedJobs,
            totalSteps,
            true,
            "Vectorization failed",
            detailMessage,
          ); // Show error
        } else if (progress.status === "started") {
          detailMessage = `Vectorization started for ${progress.total} items`;
        } else if (progress.status === "cancelled") {
          detailMessage = `Vectorization cancelled: ${progress.message}`;
          dispatchProgress(
            completedJobs,
            totalSteps,
            true,
            "Vectorization cancelled",
            detailMessage,
          );
        }

        // Update the status detail
        dispatchProgress(
          completedJobs,
          totalSteps,
          true,
          "Vectorization in progress",
          detailMessage,
        );

        // When worker signals completion of *its* task, mark the final step complete
        if (progress.status === "complete") {
          completedJobs++; // Increment completion count *after* vectorization finishes
          dispatchProgress(
            completedJobs,
            totalSteps,
            false,
            "Indexing finished",
          ); // Set indexing to false
        } else if (
          progress.status === "error" ||
          progress.status === "cancelled"
        ) {
          // Don't increment completed count on failure/cancel, just stop indexing indicator
          dispatchProgress(
            completedJobs,
            totalSteps,
            false,
            "Indexing stopped due to error/cancel",
          );
        }
      });
      console.debug(
        "%c[Indexer] Vectorization task sent to worker.",
        "color: green",
      );
      // Note: runIndexing might return *before* vectorization is complete now.
      // The progress updates will signal the true end state.
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
      ); // Stop indexing indicator
    }
  } else {
    console.debug(
      "%c[Indexer] No items to send for vectorization.",
      "color: gray",
    );
    // If no vectorization needed, indexing is done here.
    completedJobs++; // Count the "skipped" vectorization step
    dispatchProgress(
      completedJobs,
      totalSteps,
      false,
      "Indexing finished (no vectorization needed)",
    );
  }

  // Stop heartbeat ONLY when all jobs *and* the vectorization dispatch are done.
  // The actual *completion* of vectorization is now asynchronous.
  stopHeartbeat();

  // Before loading dynamic items, attach renderComponent to each item if available
  allItemsFromJobs.forEach(item => {
    const renderComponent = renderComponentMap[item.renderComponentId];
    if (renderComponent) {
      item.renderComponent = renderComponent;
    }
  });
  loadDynamicItems(allItemsFromJobs);
  window.dispatchEvent(new Event("dynamic-items-updated"));
  // Final progress update might be handled by the worker callback now.
  // dispatchProgress(completedJobs, totalSteps, false); // This might be premature
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
