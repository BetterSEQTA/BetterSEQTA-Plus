import { OpenStorePage } from "@/seqta/ui/renderStore";

/**
 * Module-level handoff for "open the theme store and highlight this theme".
 *
 * The store page is mounted lazily inside a Shadow DOM the first time it
 * opens, so a `CustomEvent` listener would have to be wired up before mount
 * (causing a race). Using a shared cell keeps the producer (popup button) and
 * consumer (store `onMount`) decoupled without that timing constraint.
 *
 * The store reads & clears this on mount via {@link consumePendingHighlightThemeId}.
 */
let pendingHighlightThemeId: string | null = null;

/** Read and clear the pending theme id (called by the store on mount). */
export function consumePendingHighlightThemeId(): string | null {
  const id = pendingHighlightThemeId;
  pendingHighlightThemeId = null;
  return id;
}

/**
 * Opens the theme store and asks it to focus / highlight the given theme.
 * If the store is already mounted we dispatch a DOM event so it can react
 * without remounting; otherwise the store consumes the pending id on mount.
 */
export function openThemeStoreWithHighlight(themeId: string): void {
  pendingHighlightThemeId = themeId;

  const existing = document.getElementById("store");
  if (existing) {
    window.dispatchEvent(
      new CustomEvent("bsplus:highlight-theme", { detail: { themeId } }),
    );
    return;
  }

  OpenStorePage();
}
