import { getAll, put, clear, remove } from './db';
import { jobs } from './jobs';
import { renderComponentMap } from './renderComponents';
import type { IndexItem, HydratedIndexItem, Job, JobContext } from './types';

const META_STORE = 'meta';
const LOCK_KEY = 'bsq-indexer-lock';
const HEARTBEAT_INTERVAL = 10000;
const LOCK_TIMEOUT = 20000;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function shouldRun(job: Job, lastRun?: number): boolean {
  const now = Date.now();

  if (job.frequency === 'pageLoad') return true;
  if (!lastRun) return true;

  if (job.frequency.type === 'interval') {
    return now - lastRun >= job.frequency.ms;
  }

  if (job.frequency.type === 'expiry') {
    return now - lastRun >= job.frequency.afterMs;
  }

  return false;
}

function getLastRunMeta(jobId: string): Promise<number | undefined> {
  return getAll(META_STORE).then(metaItems => {
    const match = metaItems.find((m: any) => m.jobId === jobId);
    return match?.lastRun;
  });
}

async function updateLastRunMeta(jobId: string): Promise<void> {
  await put(META_STORE, { jobId, lastRun: Date.now() }, jobId);
}

function shouldIndex(): boolean {
  const last = parseInt(localStorage.getItem(LOCK_KEY) || '0', 10);
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

function dispatchProgress(completed: number, total: number, indexing: boolean) {
  const event = new CustomEvent('indexing-progress', {
    detail: { completed, total, indexing }
  });
  window.dispatchEvent(event);
}

export async function loadAllStoredItems(): Promise<HydratedIndexItem[]> {
  const all: HydratedIndexItem[] = [];

  for (const jobId in jobs) {
    const items = await getAll(jobId);
    const job = jobs[jobId];
    const renderComponent = renderComponentMap[job.renderComponentId];

    for (const item of items) {
      all.push({
        ...item,
        renderComponent,
      });
    }
  }

  return all;
}

export async function runIndexing(): Promise<void> {
  if (!shouldIndex()) {
    console.debug('%c[Indexer] Skipping indexing (another tab has the lock)', 'color: gray');
    return;
  }

  startHeartbeat();
  console.debug('%c[Indexer] Starting indexing...', 'color: green');

  const jobIds = Object.keys(jobs);
  let completedJobs = 0;
  dispatchProgress(completedJobs, jobIds.length, true);

  for (const jobId of jobIds) {
    const job = jobs[jobId];
    const lastRun = await getLastRunMeta(jobId);

    if (!shouldRun(job, lastRun)) {
      console.debug(`%c[Indexer] Skipping job "${jobId}" (not due)`, 'color: gray');
      completedJobs++;
      dispatchProgress(completedJobs, jobIds.length, true);
      continue;
    }

    const getStoredItems = async () => await getAll(jobId);
    const setStoredItems = async (items: IndexItem[]) => {
      await clear(jobId);
      await Promise.all(items.map(i => put(jobId, i, i.id)));
    };
    const addItem = async (item: IndexItem) => {
      await put(jobId, item, item.id);
    };
    const removeItem = async (id: string) => {
      await remove(jobId, id);
    };

    const ctx: JobContext = {
      getStoredItems,
      setStoredItems,
      addItem,
      removeItem,
    };

    console.debug(`%c[Indexer] Running job "${jobId}"...`, 'color: #4ea1ff');

    try {
      const newItems = await job.run(ctx);
      const stored = await getStoredItems();

      let merged = mergeItems(stored, newItems);
      if (job.purge) merged = job.purge(merged);

      await setStoredItems(merged);
      await updateLastRunMeta(jobId);

      console.debug(`%c[Indexer] ✅ ${job.label}: ${newItems.length} items indexed`, 'color: #00c46f');
    } catch (err) {
      console.debug(`%c[Indexer] ❌ ${job.label} failed:`, 'color: red');
      console.error(err);
    }

    completedJobs++;
    dispatchProgress(completedJobs, jobIds.length, true);
  }

  stopHeartbeat();
  dispatchProgress(completedJobs, jobIds.length, false);
}

function mergeItems(existing: IndexItem[], incoming: IndexItem[]): IndexItem[] {
  const map = new Map<string, IndexItem>();
  for (const item of existing) map.set(item.id, item);
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}
