/** True while `runIndexing()` holds the indexer lock in this tab. */
let indexingActive = false;

export function setIndexingActive(active: boolean): void {
  indexingActive = active;
}

export function isIndexingActive(): boolean {
  return indexingActive;
}
