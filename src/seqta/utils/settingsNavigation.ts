export type SettingsDestination =
  | { page: "settings"; section?: string }
  | { page: "themes" | "backgrounds"; view?: "settings" | "store" | "custom" };

export const SETTINGS_NAVIGATION_EVENT = "bsplus:navigate-settings";

let pendingDestination: SettingsDestination | null = null;

export function requestSettingsDestination(destination: SettingsDestination): void {
  pendingDestination = destination;
  window.dispatchEvent(
    new CustomEvent(SETTINGS_NAVIGATION_EVENT, { detail: destination }),
  );
}

export function consumeSettingsDestination(): SettingsDestination | null {
  const destination = pendingDestination;
  pendingDestination = null;
  return destination;
}
