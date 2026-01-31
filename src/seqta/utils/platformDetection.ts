/**
 * Platform detection utilities for SEQTA
 * Uses localStorage caching to avoid repeated detection on navigation
 */

import browser from "webextension-polyfill";

export type SEQTAPlatform = 'learn' | 'teach' | 'unknown';

interface CachedPlatformData {
  platform: SEQTAPlatform;
  version: number;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'betterseqta_platform_';
const CACHE_VERSION = 1; // Increment to invalidate old cache

/**
 * Gets a cache key based on the current domain
 */
function getCacheKey(): string {
  const hostname = window.location.hostname;
  return `${STORAGE_KEY_PREFIX}${hostname}`;
}

/**
 * Gets cached platform from localStorage
 */
async function getCachedPlatform(): Promise<SEQTAPlatform | null> {
  try {
    const cacheKey = getCacheKey();
    const cached = await browser.storage.local.get(cacheKey);
    const cachedData = cached[cacheKey] as CachedPlatformData | undefined;
    
    if (cachedData && 'platform' in cachedData && 'version' in cachedData && cachedData.version === CACHE_VERSION) {
      // Verify the cached platform is still valid by checking URL
      const url = window.location.href.toLowerCase();
      const cachedPlatform = cachedData.platform;
      
      // Quick validation: if URL clearly indicates a different platform, invalidate cache
      if (cachedPlatform === 'teach' && (url.includes('/learn/') || url.includes('/student/'))) {
        return null; // Cache invalid
      }
      if (cachedPlatform === 'learn' && (url.includes('/teach/') || url.includes('/ta/'))) {
        return null; // Cache invalid
      }
      
      return cachedPlatform;
    }
  } catch (error) {
    console.debug('[BetterSEQTA+] Error reading cached platform:', error);
  }
  return null;
}

/**
 * Caches platform in localStorage
 */
async function setCachedPlatform(platform: SEQTAPlatform): Promise<void> {
  try {
    const cacheKey = getCacheKey();
    await browser.storage.local.set({
      [cacheKey]: {
        platform,
        version: CACHE_VERSION,
        timestamp: Date.now(),
      }
    });
  } catch (error) {
    console.debug('[BetterSEQTA+] Error caching platform:', error);
  }
}

/**
 * Detects which SEQTA platform we're currently on
 * Uses multiple methods to detect the platform, including title, URL, and DOM elements
 * @param forceRefresh - If true, bypasses cache and forces re-detection
 * @returns The detected platform type
 */
export async function detectSEQTAPlatform(forceRefresh: boolean = false): Promise<SEQTAPlatform> {
  // Check cache first unless forcing refresh
  if (!forceRefresh) {
    const cached = await getCachedPlatform();
    if (cached) {
      return cached;
    }
  }
  
  let detectedPlatform: SEQTAPlatform = 'unknown';
  
  // Method 1: Check URL path (most reliable, fastest)
  const url = window.location.href.toLowerCase();
  if (url.includes('/learn/') || url.includes('/student/')) {
    detectedPlatform = 'learn';
  } else if (url.includes('/teach/') || url.includes('/ta/')) {
    detectedPlatform = 'teach';
  }
  
  // Method 2: Check document title (if URL didn't give us a result)
  if (detectedPlatform === 'unknown') {
    const title = document.title.toLowerCase();
    if (title.includes('seqta learn')) {
      detectedPlatform = 'learn';
    } else if (title.includes('seqta teach')) {
      detectedPlatform = 'teach';
    }
  }
  
  // Method 3: Check for platform-specific DOM elements (most expensive, last resort)
  if (detectedPlatform === 'unknown' && document.body) {
    // Check for Teach-specific indicators (more specific first)
    const teachIndicators = [
      document.querySelector('[class*="Spine__Spine"]'), // Teach Spine component
      document.querySelector('[id*="ta"]'),
      document.querySelector('[class*="ta"]'),
    ];
    
    if (teachIndicators.some(el => el !== null)) {
      detectedPlatform = 'teach';
    } else {
      // Check for Learn-specific indicators
      const learnIndicators = [
        document.querySelector('[class*="learn"]'),
        document.querySelector('[id*="learn"]'),
        document.querySelector('[class*="student"]'),
      ];
      
      if (learnIndicators.some(el => el !== null)) {
        detectedPlatform = 'learn';
      }
    }
  }
  
  // Cache the result if we detected something
  if (detectedPlatform !== 'unknown') {
    await setCachedPlatform(detectedPlatform);
  }
  
  return detectedPlatform;
}

/**
 * Synchronous version for cases where async isn't possible
 * Uses cache synchronously if available, otherwise does quick detection
 */
let syncCachedPlatform: SEQTAPlatform | null = null;
let syncCacheInitialized = false;

export function detectSEQTAPlatformSync(): SEQTAPlatform {
  // Initialize sync cache on first call
  if (!syncCacheInitialized) {
    syncCacheInitialized = true;
    // Try to get from cache synchronously (will be null if not cached yet)
    browser.storage.local.get(getCacheKey()).then((cached) => {
      const cachedData = cached[getCacheKey()] as CachedPlatformData | undefined;
      if (cachedData && cachedData.platform && cachedData.version === CACHE_VERSION) {
        syncCachedPlatform = cachedData.platform;
      }
    }).catch(() => {
      // Ignore errors
    });
  }
  
  // Use cached value if available
  if (syncCachedPlatform) {
    return syncCachedPlatform;
  }
  
  // Check body attribute first (set by main() after async detection)
  if (document.body) {
    const platformAttr = document.body.getAttribute('data-seqta-platform');
    if (platformAttr === 'teach' || platformAttr === 'learn') {
      return platformAttr as SEQTAPlatform;
    }
  }
  
  // Quick synchronous detection (URL-based)
  const url = window.location.href.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();
  
  // Check hostname for teach/learn subdomains
  if (hostname.includes('teach.') || hostname.includes('.teach')) {
    return 'teach';
  }
  if (hostname.includes('learn.') || hostname.includes('.learn')) {
    return 'learn';
  }
  
  // Check URL path
  if (url.includes('/learn/') || url.includes('/student/')) {
    return 'learn';
  }
  if (url.includes('/teach/') || url.includes('/ta/')) {
    return 'teach';
  }
  
  // Check title
  const title = document.title.toLowerCase();
  if (title.includes('seqta learn')) {
    return 'learn';
  }
  if (title.includes('seqta teach')) {
    return 'teach';
  }
  
  return 'unknown';
}

/**
 * Checks if we're currently on SEQTA Learn
 * @param forceRefresh - If true, bypasses cache
 * @returns true if on SEQTA Learn, false otherwise
 */
export async function isSEQTALearn(forceRefresh: boolean = false): Promise<boolean> {
  return (await detectSEQTAPlatform(forceRefresh)) === 'learn';
}

/**
 * Checks if we're currently on SEQTA Teach
 * @param forceRefresh - If true, bypasses cache
 * @returns true if on SEQTA Teach, false otherwise
 */
export async function isSEQTATeach(forceRefresh: boolean = false): Promise<boolean> {
  return (await detectSEQTAPlatform(forceRefresh)) === 'teach';
}

/**
 * Synchronous version of isSEQTATeach
 */
export function isSEQTATeachSync(): boolean {
  return detectSEQTAPlatformSync() === 'teach';
}

/**
 * Synchronous version of isSEQTALearn
 */
export function isSEQTALearnSync(): boolean {
  return detectSEQTAPlatformSync() === 'learn';
}

/**
 * Clears cached platform for current domain
 */
export async function clearPlatformCache(): Promise<void> {
  try {
    const cacheKey = getCacheKey();
    await browser.storage.local.remove(cacheKey);
    syncCachedPlatform = null;
    syncCacheInitialized = false;
  } catch (error) {
    console.debug('[BetterSEQTA+] Error clearing platform cache:', error);
  }
}
