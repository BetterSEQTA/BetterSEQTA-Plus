import type { Job } from "../types";

/**
 * Stub job for the passive-observer store.
 *
 * The passive observer (see `passiveObserver.ts`) writes captured items
 * directly into IndexedDB via `getAll`/`put`. We still register a job here
 * so the indexer:
 *  - Creates the `passive` object store on first use.
 *  - Picks up the right `renderComponentId` when materializing in-memory
 *    items in `loadAllStoredItems()`.
 *  - Applies a deterministic boost / purge policy to passive results.
 *
 * `run()` is a no-op: the passive observer has its own write path so it
 * works whether or not an active indexing pass is running.
 */
export const passiveJob: Job = {
  id: "passive",
  label: "Recently viewed",
  renderComponentId: "passive",
  // Run frequently so any newly captured items are merged into the
  // dynamic-items cache on the next indexing tick. The actual capture is
  // continuous; this is only the synchronization cadence.
  frequency: { type: "interval", ms: 1000 * 60 * 5 },

  boostCriteria: (item, searchTerm) => {
    // Passive items are noisier than curated ones, so penalize them
    // slightly when there's no query and only modestly help on matches.
    if (!searchTerm) return -60;
    let score = 0;
    if (item.metadata?.entityType) score += 0.02;
    return score;
  },

  run: async () => {
    return [];
  },

  purge: (items) => {
    // Keep the most recent ~500 passive entries and anything newer than
    // 30 days. This caps storage growth from heavy browsing sessions.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = items
      .filter((i) => i.dateAdded >= cutoff)
      .sort((a, b) => b.dateAdded - a.dateAdded)
      .slice(0, 500);
    return recent;
  },
};
