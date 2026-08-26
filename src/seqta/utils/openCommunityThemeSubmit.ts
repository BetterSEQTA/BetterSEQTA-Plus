/**
 * Module-level handoff for "open Community themes → My themes → submit modal".
 */
const OPEN_COMMUNITY_SUBMIT_SESSION_KEY = "bsplus:open-community-theme-submit";

export const OPEN_COMMUNITY_SUBMIT_EVENT = "bsplus:open-community-submit";

let pendingOpenSubmit = false;

export function requestOpenCommunityThemeSubmit(): void {
  pendingOpenSubmit = true;
  try {
    sessionStorage.setItem(OPEN_COMMUNITY_SUBMIT_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(OPEN_COMMUNITY_SUBMIT_EVENT));
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

export async function openCommunityThemeSubmit(): Promise<void> {
  requestOpenCommunityThemeSubmit();
  const [{ requestSettingsDestination }, { openSettingsPopup }] =
    await Promise.all([
      import("@/seqta/utils/settingsNavigation"),
      import("@/seqta/utils/setupSettingsButton"),
    ]);
  requestSettingsDestination({ page: "themes", view: "community" });
  await openSettingsPopup();
}
