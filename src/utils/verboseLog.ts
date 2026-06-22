import { settingsState } from "@/seqta/utils/listeners/SettingsState";

const VERBOSE_LOG_ATTR = "data-bsplus-verbose-log";

export function isVerboseLoggingEnabled(): boolean {
  return Boolean(settingsState.devMode && settingsState.verboseLogging);
}

export function syncVerboseLogDomFlag(): void {
  if (typeof document === "undefined") return;
  document.documentElement.toggleAttribute(
    VERBOSE_LOG_ATTR,
    isVerboseLoggingEnabled(),
  );
}

let initialized = false;

/** Register DOM flag sync when dev / verbose toggles change. Call after settings load. */
export function initVerboseLogging(): void {
  if (initialized) return;
  initialized = true;
  syncVerboseLogDomFlag();
  settingsState.register("devMode", () => syncVerboseLogDomFlag());
  settingsState.register("verboseLogging", () => syncVerboseLogDomFlag());
}

export function verboseDebug(...args: unknown[]): void {
  if (isVerboseLoggingEnabled()) console.debug(...args);
}

export function verboseInfo(...args: unknown[]): void {
  if (isVerboseLoggingEnabled()) console.info(...args);
}

export function verboseLog(...args: unknown[]): void {
  if (isVerboseLoggingEnabled()) console.log(...args);
}
