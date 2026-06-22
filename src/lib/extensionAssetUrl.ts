import browser from "webextension-polyfill";

/** Vite `?url` imports are already absolute extension URLs in production bundles. */
export function resolveExtensionAssetUrl(importedUrl: string): string {
  if (/^(chrome-extension|moz-extension|https?):/.test(importedUrl)) {
    return importedUrl;
  }
  return browser.runtime.getURL(importedUrl.replace(/^\/+/, ""));
}
