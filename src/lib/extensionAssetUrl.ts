import browser from "webextension-polyfill";

/** Resolve Vite asset imports to a usable extension URL. */
export function resolveExtensionAssetUrl(url: string): string {
  const doubled = url.match(/^((?:chrome|moz)-extension:\/\/[^/]+)\/\1\/(.+)$/);
  if (doubled) return `${doubled[1]}/${doubled[2]}`;
  if (/^(?:chrome|moz)-extension:\/\/|https?:|data:/.test(url)) return url;
  return browser.runtime.getURL(url.replace(/^\/+/, ""));
}

