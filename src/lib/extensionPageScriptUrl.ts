import browser from "webextension-polyfill";

/**
 * Resolve a CRXJS `?script` / `?script&iife` import to a web-accessible
 * chrome-extension:// URL. Works in both `vite build` and `vite dev`
 * (plain `?url` imports 404 in CRXJS serve because they are not packaged).
 */
export function extensionPageScriptUrl(scriptPath: string): string {
  return browser.runtime.getURL(scriptPath.replace(/^\/+/, ""));
}
