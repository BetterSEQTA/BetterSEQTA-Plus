/**
 * Module-level handoff for "open the theme store and highlight this theme".
 */
let pendingHighlightThemeId: string | null = null;

export function consumePendingHighlightThemeId(): string | null {
  const id = pendingHighlightThemeId;
  pendingHighlightThemeId = null;
  return id;
}

export async function openThemeStoreWithHighlight(themeId: string): Promise<void> {
  pendingHighlightThemeId = themeId;
  const { OpenStorePage } = await import("@/seqta/ui/renderStore");
  await OpenStorePage();
  window.dispatchEvent(
    new CustomEvent("bsplus:highlight-theme", { detail: { themeId } }),
  );
}
