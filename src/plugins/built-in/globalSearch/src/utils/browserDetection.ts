import browser from "webextension-polyfill";

/**
 * Detects if the current browser is Firefox
 */
export function isFirefox(): boolean {
  try {
    // Firefox-specific API
    if (typeof (browser.runtime as any).getBrowserInfo === "function") {
      return true;
    }
    // Fallback: check user agent
    if (typeof navigator !== "undefined") {
      return navigator.userAgent.toLowerCase().includes("firefox");
    }
    return false;
  } catch {
    // If we can't detect, assume not Firefox (safer for Chrome/Edge)
    return false;
  }
}

/**
 * Checks if vector search is supported in the current browser
 * Currently disabled for Firefox due to security restrictions
 */
export function isVectorSearchSupported(): boolean {
  return !isFirefox();
}

