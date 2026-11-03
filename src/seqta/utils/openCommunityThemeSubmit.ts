/**
 * Module-level handoff for "open Community themes → My themes → submit modal".
 */
const OPEN_COMMUNITY_SUBMIT_SESSION_KEY = "bsplus:open-community-theme-submit";
const OPEN_COMMUNITY_SUBMIT_THEME_KEY = "bsplus:open-community-theme-submit-theme-id";

export const OPEN_COMMUNITY_SUBMIT_EVENT = "bsplus:open-community-submit";

let pendingOpenSubmit = false;
let pendingSubmitThemeId: string | null = null;

export function requestOpenCommunityThemeSubmit(themeId?: string): void {
  pendingOpenSubmit = true;
  if (themeId) pendingSubmitThemeId = themeId;
  try {
    sessionStorage.setItem(OPEN_COMMUNITY_SUBMIT_SESSION_KEY, "1");
    if (themeId) sessionStorage.setItem(OPEN_COMMUNITY_SUBMIT_THEME_KEY, themeId);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(OPEN_COMMUNITY_SUBMIT_EVENT));
}

export function consumePendingCommunitySubmitThemeId(): string | null {
  let themeId = pendingSubmitThemeId;
  pendingSubmitThemeId = null;
  try {
    const stored = sessionStorage.getItem(OPEN_COMMUNITY_SUBMIT_THEME_KEY);
    if (stored) {
      sessionStorage.removeItem(OPEN_COMMUNITY_SUBMIT_THEME_KEY);
      themeId = stored;
    }
  } catch {
    /* ignore */
  }
  return themeId;
}

export function consumeOpenCommunityThemeSubmit(): boolean {
  let shouldOpen = pendingOpenSubmit;
  pendingOpenSubmit = false;

  try {
    if (sessionStorage.getItem(OPEN_COMMUNITY_SUBMIT_SESSION_KEY)) {
      sessionStorage.removeItem(OPEN_COMMUNITY_SUBMIT_SESSION_KEY);
      shouldOpen = true;
    }
  } catch {
    /* ignore */
  }

  return shouldOpen;
}

export async function openCommunityThemeSubmit(themeId?: string): Promise<void> {
  const { launchPageThemeBuilder } = await import("@/seqta/utils/launchPageThemeBuilder");
  await launchPageThemeBuilder(themeId);
}
