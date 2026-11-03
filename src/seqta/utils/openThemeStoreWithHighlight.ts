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
  const { openStorePage } = await import("@/seqta/ui/renderStore");
  await openStorePage();
  window.dispatchEvent(new CustomEvent("bsplus:highlight-theme", { detail: { themeId } }));
}
