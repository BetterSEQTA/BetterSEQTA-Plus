import { waitForElm } from "@/seqta/utils/waitForElm";

/**
 * Shared readiness promises for SEQTA chrome elements that titlebar, search,
 * and sidebar all wait on. Avoids overlapping waitForElm observers/polls.
 */

type ShellKey = "title" | "menu";

const inflight = new Map<ShellKey, Promise<Element>>();

function sharedWait(
  key: ShellKey,
  selector: string,
  interval: number,
  maxIterations: number,
): Promise<Element> {
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = waitForElm(selector, true, interval, maxIterations).then(
    (el) => el,
    (err) => {
      inflight.delete(key);
      throw err;
    },
  );
  inflight.set(key, promise);
  return promise;
}

/** Resolves once `#title` exists (shared across titlebar + global search). */
export function waitForSeqtaTitle(
  interval = 50,
  maxIterations = 200,
): Promise<Element> {
  const immediate = document.querySelector("#title");
  if (immediate) return Promise.resolve(immediate);
  return sharedWait("title", "#title", interval, maxIterations);
}

/** Resolves once `#menu` exists (shared across sidebar + background layers). */
export function waitForSeqtaMenu(
  interval = 50,
  maxIterations = 200,
): Promise<Element> {
  const immediate = document.querySelector("#menu");
  if (immediate) return Promise.resolve(immediate);
  return sharedWait("menu", "#menu", interval, maxIterations);
}

/** Test/helpers: clear shared caches between mounts. */
export function resetSeqtaShellWaiters(): void {
  inflight.clear();
}
