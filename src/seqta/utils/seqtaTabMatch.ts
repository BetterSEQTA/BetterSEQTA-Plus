import type { Tabs } from "webextension-polyfill";

/** Same rules as background `isSeqtaOrigin` / ConnectMobileApp `isSeqtaUrl`. */
export function isSeqtaHostname(hostname: string): boolean {
  return hostname.includes("seqta") || hostname.endsWith(".edu.au");
}

export function isSeqtaPageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return isSeqtaHostname(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Whether a browser tab is likely SEQTA Learn/Engage (for background `tabs.sendMessage`).
 * URL check covers custom school hosts; title covers cases where URL is not yet available.
 */
export function isSeqtaTab(tab: Tabs.Tab): boolean {
  if (tab.url && isSeqtaPageUrl(tab.url)) return true;
  const title = tab.title ?? "";
  return title.includes("SEQTA Learn") || title.includes("SEQTA Engage");
}
