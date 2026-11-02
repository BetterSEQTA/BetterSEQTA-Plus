/** Worker-safe logging — no extension APIs or SettingsState. */

export function verboseDebug(...args: unknown[]): void {
  if (typeof console !== "undefined") console.debug(...args);
}
