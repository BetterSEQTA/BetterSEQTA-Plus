/** Worker-safe logging — no webextension-polyfill or SettingsState. */

export function verboseDebug(...args: unknown[]): void {
  if (typeof console !== "undefined") console.debug(...args);
}

export function verboseInfo(...args: unknown[]): void {
  if (typeof console !== "undefined") console.info(...args);
}

export function verboseLog(...args: unknown[]): void {
  if (typeof console !== "undefined") console.log(...args);
}
