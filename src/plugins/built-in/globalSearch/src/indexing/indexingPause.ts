/** In-memory gate: after a manual reset, skip indexing until the tab reloads. */
let pausedUntilReload = false;

export function pauseIndexingUntilReload(): void {
  pausedUntilReload = true;
}

export function isIndexingPaused(): boolean {
  return pausedUntilReload;
}
