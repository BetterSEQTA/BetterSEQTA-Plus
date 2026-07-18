import { settingsState } from "@/seqta/utils/listeners/SettingsState";

export function verboseLog(...args: unknown[]): void {
  if (settingsState.devMode) console.log(...args);
}
