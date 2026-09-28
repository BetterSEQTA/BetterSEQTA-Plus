import { requestSettingsDestination } from "@/seqta/utils/settingsNavigation";
import { openSettingsPopup } from "@/seqta/utils/setupSettingsButton";

const FOUNDER_BADGE_SETTING_SEARCH = "Titlebar founder badge";

/** Open BetterSEQTA+ settings on the titlebar founder badge toggle. */
export async function openFounderBadgeSettings(): Promise<void> {
  requestSettingsDestination({
    page: "settings",
    section: "account",
    search: FOUNDER_BADGE_SETTING_SEARCH,
  });
  await openSettingsPopup();
}

export { FOUNDER_BADGE_SETTING_SEARCH };
