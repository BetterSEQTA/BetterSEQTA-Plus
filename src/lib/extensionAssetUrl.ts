import browser from "webextension-polyfill";

/** Vite asset imports are often already absolute extension URLs in production bundles. */
export function resolveExtensionAssetUrl(importedUrl: string): string {
  if (!importedUrl) return importedUrl;

  const doublePrefix = importedUrl.match(
    /^((?:chrome|moz)-extension:\/\/[^/]+)\/\1\/(.+)$/,
  );
  if (doublePrefix) {
    return `${doublePrefix[1]}/${doublePrefix[2]}`;
  }

  if (/^(chrome-extension|moz-extension|https?|data):/.test(importedUrl)) {
    return importedUrl;
  }
  return browser.runtime.getURL(importedUrl.replace(/^\/+/, ""));
}
