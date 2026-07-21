/**
 * Allowlist for popup/API media URLs.
 * Accepts https: and same-extension chrome-extension:/moz-extension: URLs.
 */
export function allowedPopupImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") return parsed.href;

    if (
      parsed.protocol === "chrome-extension:" ||
      parsed.protocol === "moz-extension:"
    ) {
      const extId =
        typeof chrome !== "undefined" && chrome.runtime?.id
          ? chrome.runtime.id
          : undefined;
      if (extId && parsed.hostname === extId) return parsed.href;
    }

    return null;
  } catch {
    return null;
  }
}
