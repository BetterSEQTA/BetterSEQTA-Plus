/** Worker-safe logging — no webextension-polyfill or SettingsState. */

export function verboseDebug(...args: unknown[]): void {
  if (typeof console !== "undefined") console.debug(...args);
}
