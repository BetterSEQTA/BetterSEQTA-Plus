import { settingsState } from "@/seqta/utils/listeners/SettingsState";

/** Whether the BetterSEQTA login portal should replace SEQTA's native login shell. */
export function isCustomLoginPortalEnabled(): boolean {
  return settingsState.onoff && settingsState.customLoginPortal !== false;
}
