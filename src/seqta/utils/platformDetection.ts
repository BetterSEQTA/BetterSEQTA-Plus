/**
 * Core SEQTA platform detection.
 * Cached per-domain; experience hooks in isSeqtaLearn/Teach/Engage.ts wrap this.
 */

import browser from "webextension-polyfill";

export type SEQTAPlatform = "learn" | "teach" | "engage" | "unknown";

interface CachedPlatformData {
  platform: SEQTAPlatform;
  version: number;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = "betterseqta_platform_";
const CACHE_VERSION = 3;

function getCacheKey(): string {
  return `${STORAGE_KEY_PREFIX}${window.location.hostname}`;
}

function titleLower(): string {
  return document.title.toLowerCase();
}

function hrefLower(): string {
  return window.location.href.toLowerCase();
}

function hostnameLower(): string {
  return window.location.hostname.toLowerCase();
}

function isEngageTitle(): boolean {
  return document.title.includes("SEQTA Engage");
}

function isLearnTitle(): boolean {
  return titleLower().includes("seqta learn");
}

function isTeachTitle(): boolean {
  return titleLower().includes("seqta teach");
}

function hasTeachDomSignals(): boolean {
  return (
    document.querySelector('[class*="Spine__Spine"]') !== null ||
    document.querySelector('[id*="ta"]') !== null ||
    document.querySelector('[class*="ta"]') !== null
  );
}

function hasLearnDomSignals(): boolean {
  return (
    document.querySelector('[class*="learn"]') !== null ||
    document.querySelector('[id*="learn"]') !== null ||
    document.querySelector('[class*="student"]') !== null
  );
}

function isCachedPlatformStillValid(cachedPlatform: SEQTAPlatform): boolean {
  const url = hrefLower();
  const hostname = hostnameLower();
  const fromHost = detectFromUrlAndHost();

  // Host/URL signals win over a stale cache (teach-international pages often omit "Teach" in the title)
  if (fromHost !== "unknown" && fromHost !== cachedPlatform) {
    return false;
  }

  if (cachedPlatform === "engage" && !isEngageTitle() && fromHost !== "engage") {
    return false;
  }
  if (
    cachedPlatform === "teach" &&
    (url.includes("/learn/") || url.includes("/student/") || hostname.includes("learn."))
  ) {
    return false;
  }
  if (
    cachedPlatform === "learn" &&
    (url.includes("/teach/") ||
      url.includes("/ta/") ||
      url.includes("/betterseqta-home") ||
      hostname.startsWith("teach") ||
      hostname.includes("teach."))
  ) {
    return false;
  }
  if (
    cachedPlatform === "engage" &&
    (url.includes("/teach/") || url.includes("/ta/") || hostname.startsWith("teach"))
  ) {
    return false;
  }

  return true;
}

async function getCachedPlatform(): Promise<SEQTAPlatform | null> {
  try {
    const cacheKey = getCacheKey();
    const cached = await browser.storage.local.get(cacheKey);
    const cachedData = cached[cacheKey] as CachedPlatformData | undefined;

    if (
      cachedData &&
      "platform" in cachedData &&
      "version" in cachedData &&
      cachedData.version === CACHE_VERSION &&
      isCachedPlatformStillValid(cachedData.platform)
    ) {
      return cachedData.platform;
    }
  } catch (error) {
    console.debug("[BetterSEQTA+] Error reading cached platform:", error);
  }
  return null;
}

async function setCachedPlatform(platform: SEQTAPlatform): Promise<void> {
  if (platform === "unknown") return;

  try {
    const cacheKey = getCacheKey();
    await browser.storage.local.set({
      [cacheKey]: {
        platform,
        version: CACHE_VERSION,
        timestamp: Date.now(),
      },
    });
    syncCachedPlatform = platform;
  } catch (error) {
    console.debug("[BetterSEQTA+] Error caching platform:", error);
  }
}

/** Pure helper — exported for unit tests. */
export function detectPlatformFromUrlAndHost(
  hostname: string,
  href: string,
): SEQTAPlatform {
  const host = hostname.toLowerCase();
  const url = href.toLowerCase();

  if (
    host.includes("engage.") ||
    host.includes(".engage") ||
    host.startsWith("engage-") ||
    host.includes("-engage.")
  ) {
    return "engage";
  }
  // teach-international.site.seqta.com.au, teach.example.edu, etc.
  if (
    host.includes("teach.") ||
    host.includes(".teach") ||
    host.startsWith("teach-") ||
    host.includes("-teach.")
  ) {
    return "teach";
  }
  if (
    host.includes("learn.") ||
    host.includes(".learn") ||
    host.startsWith("learn-") ||
    host.includes("-learn.")
  ) {
    return "learn";
  }

  if (url.includes("/engage/") || url.includes("/parent/")) {
    return "engage";
  }
  if (
    url.includes("/teach/") ||
    url.includes("/ta/") ||
    url.includes("/betterseqta-home") ||
    url.includes("/seqta/ta/")
  ) {
    return "teach";
  }
  if (url.includes("/learn/") || url.includes("/student/")) {
    return "learn";
  }

  return "unknown";
}

function detectFromUrlAndHost(): SEQTAPlatform {
  return detectPlatformFromUrlAndHost(hostnameLower(), hrefLower());
}

function detectFromTitle(): SEQTAPlatform {
  if (isEngageTitle()) return "engage";
  if (isTeachTitle()) return "teach";
  if (isLearnTitle()) return "learn";
  return "unknown";
}

function detectFromDom(): SEQTAPlatform {
  if (!document.body) return "unknown";
  if (hasTeachDomSignals()) return "teach";
  if (hasLearnDomSignals()) return "learn";
  return "unknown";
}

function detectPlatformFromSignals(): SEQTAPlatform {
  if (isEngageTitle()) return "engage";

  const fromUrl = detectFromUrlAndHost();
  if (fromUrl !== "unknown") return fromUrl;

  const fromTitle = detectFromTitle();
  if (fromTitle !== "unknown") return fromTitle;

  return detectFromDom();
}

/**
 * Detects which SEQTA platform we're currently on.
 * Uses title, URL, hostname, and DOM signals (in that priority for Engage/title cases).
 */
export async function detectSEQTAPlatform(
  forceRefresh: boolean = false,
): Promise<SEQTAPlatform> {
  if (!forceRefresh) {
    const cached = await getCachedPlatform();
    if (cached) return cached;
  }

  const detectedPlatform = detectPlatformFromSignals();
  await setCachedPlatform(detectedPlatform);
  return detectedPlatform;
}

let syncCachedPlatform: SEQTAPlatform | null = null;
let syncCacheInitialized = false;

export function detectSEQTAPlatformSync(): SEQTAPlatform {
  if (!syncCacheInitialized) {
    syncCacheInitialized = true;
    browser.storage.local
      .get(getCacheKey())
      .then((cached) => {
        const cachedData = cached[getCacheKey()] as CachedPlatformData | undefined;
        if (
          cachedData &&
          cachedData.platform &&
          cachedData.version === CACHE_VERSION &&
          isCachedPlatformStillValid(cachedData.platform)
        ) {
          syncCachedPlatform = cachedData.platform;
        }
      })
      .catch(() => {});
  }

  const platformAttr = document.body?.getAttribute("data-seqta-platform");
  if (
    platformAttr === "teach" ||
    platformAttr === "learn" ||
    platformAttr === "engage"
  ) {
    syncCachedPlatform = platformAttr;
    return platformAttr;
  }

  // Prefer live host/URL signals over a possibly-stale sync cache
  const fromSignals = detectPlatformFromSignals();
  if (fromSignals !== "unknown") {
    syncCachedPlatform = fromSignals;
    return fromSignals;
  }

  if (syncCachedPlatform) {
    return syncCachedPlatform;
  }

  return "unknown";
}

/** @deprecated Use isSeqtaLearnExperience() from isSeqtaLearn.ts */
export async function isSEQTALearn(forceRefresh: boolean = false): Promise<boolean> {
  return (await detectSEQTAPlatform(forceRefresh)) === "learn";
}

/** @deprecated Use isSeqtaTeachExperience() from isSeqtaTeach.ts */
export async function isSEQTATeach(forceRefresh: boolean = false): Promise<boolean> {
  return (await detectSEQTAPlatform(forceRefresh)) === "teach";
}

/** @deprecated Use isSeqtaTeachExperience() from isSeqtaTeach.ts */
export function isSEQTATeachSync(): boolean {
  return detectSEQTAPlatformSync() === "teach";
}

/** @deprecated Use isSeqtaLearnExperience() from isSeqtaLearn.ts */
export function isSEQTALearnSync(): boolean {
  return detectSEQTAPlatformSync() === "learn";
}

export async function clearPlatformCache(): Promise<void> {
  try {
    const cacheKey = getCacheKey();
    await browser.storage.local.remove(cacheKey);
    syncCachedPlatform = null;
    syncCacheInitialized = false;
  } catch (error) {
    console.debug("[BetterSEQTA+] Error clearing platform cache:", error);
  }
}
