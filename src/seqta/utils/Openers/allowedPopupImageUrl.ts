/**
 * Minimal allowlist for remote popup/API image (and media) URLs.
 * Only https: URLs are accepted; everything else is rejected.
 */
export function allowedPopupImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}
