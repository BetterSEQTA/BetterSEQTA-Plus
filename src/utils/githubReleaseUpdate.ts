import semver from "semver";
import browser from "webextension-polyfill";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

const CHECK_THROTTLE_MS = 6 * 60 * 60 * 1000;
const LAST_CHECK_KEY = "bsplus_lastGhReleaseCheck";
const NIGHTLY_TAG = "nightly";

let cachedResult: GhReleaseUpdateInfo | null = null;

export interface GhReleaseUpdateInfo {
  available: boolean;
  label: string;
  url: string;
}

function isUpdateCheckEnabled(): boolean {
  return typeof __ENABLE_GH_RELEASE_UPDATE_CHECK__ !== "undefined"
    && __ENABLE_GH_RELEASE_UPDATE_CHECK__;
}

function getRepoSlug(): string {
  return typeof __GH_RELEASE_REPO__ !== "undefined"
    ? __GH_RELEASE_REPO__
    : "BetterSEQTA/BetterSEQTA-Plus";
}

function getUpdateChannel(): "stable" | "nightly" {
  return typeof __UPDATE_CHANNEL__ !== "undefined"
    ? __UPDATE_CHANNEL__
    : "stable";
}

function getBuildLabel(): string {
  return typeof __BUILD_LABEL__ !== "undefined" ? __BUILD_LABEL__ : "";
}

function getCurrentVersion(): string {
  return browser.runtime.getManifest().version;
}

function releasesBaseUrl(): string {
  return `https://github.com/${getRepoSlug()}/releases`;
}

function shouldThrottleCheck(): boolean {
  try {
    const last = localStorage.getItem(LAST_CHECK_KEY);
    if (!last) return false;
    return Date.now() - Number(last) < CHECK_THROTTLE_MS;
  } catch {
    return false;
  }
}

function markChecked(): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function getDevOverrideVersion(): string | null {
  if (!settingsState.devMode) return null;
  const override = settingsState.devGhReleaseVersionOverride?.trim();
  return override || null;
}

function compareWithOverride(current: string): GhReleaseUpdateInfo | null {
  const override = getDevOverrideVersion();
  if (!override) return null;

  const currentCoerced = semver.coerce(current);
  const overrideCoerced = semver.coerce(override);
  if (!currentCoerced || !overrideCoerced) return null;

  if (semver.gt(overrideCoerced, currentCoerced)) {
    return {
      available: true,
      label: override,
      url: releasesBaseUrl(),
    };
  }

  return { available: false, label: "", url: releasesBaseUrl() };
}

interface GhRelease {
  tag_name: string;
  published_at: string;
  prerelease: boolean;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isStableSemverTag(tag: string): boolean {
  if (tag === NIGHTLY_TAG) return false;
  return semver.valid(semver.coerce(tag)) !== null;
}

async function checkStableUpdate(current: string): Promise<GhReleaseUpdateInfo> {
  const url = releasesBaseUrl();
  const releases = await fetchJson<GhRelease[]>(
    `https://api.github.com/repos/${getRepoSlug()}/releases`,
  );

  if (!releases?.length) {
    return { available: false, label: "", url };
  }

  let latestTag: string | null = null;
  let latestVersion: semver.SemVer | null = null;

  for (const release of releases) {
    const tag = release.tag_name;
    if (!isStableSemverTag(tag)) continue;

    const coerced = semver.coerce(tag);
    if (!coerced) continue;

    if (!latestVersion || semver.gt(coerced, latestVersion)) {
      latestVersion = coerced;
      latestTag = tag;
    }
  }

  const currentCoerced = semver.coerce(current);
  if (!latestTag || !latestVersion || !currentCoerced) {
    return { available: false, label: "", url };
  }

  if (semver.gt(latestVersion, currentCoerced)) {
    return { available: true, label: latestTag, url: `${url}/tag/${latestTag}` };
  }

  return { available: false, label: "", url };
}

async function checkNightlyUpdate(): Promise<GhReleaseUpdateInfo> {
  const url = `${releasesBaseUrl()}/tag/${NIGHTLY_TAG}`;
  const release = await fetchJson<GhRelease>(
    `https://api.github.com/repos/${getRepoSlug()}/releases/tags/${NIGHTLY_TAG}`,
  );

  if (!release?.published_at) {
    return { available: false, label: "", url };
  }

  const lastSeen = settingsState.lastSeenNightlyPublishedAt;
  const buildLabel = getBuildLabel();
  const label = buildLabel ? `nightly #${buildLabel}` : "nightly";

  if (!lastSeen) {
    settingsState.lastSeenNightlyPublishedAt = release.published_at;
    return { available: false, label: "", url };
  }

  if (new Date(release.published_at) > new Date(lastSeen)) {
    return { available: true, label, url };
  }

  return { available: false, label: "", url };
}

export function isGhReleaseUpdateCheckEnabled(): boolean {
  return isUpdateCheckEnabled();
}

export async function checkGithubReleaseUpdate(): Promise<GhReleaseUpdateInfo> {
  const fallback = { available: false, label: "", url: releasesBaseUrl() };

  if (!isUpdateCheckEnabled()) return fallback;

  const current = getCurrentVersion();
  const overrideResult = compareWithOverride(current);
  if (overrideResult) return overrideResult;

  if (shouldThrottleCheck()) {
    return cachedResult ?? fallback;
  }

  markChecked();

  const result =
    getUpdateChannel() === "nightly"
      ? await checkNightlyUpdate()
      : await checkStableUpdate(current);

  cachedResult = result;
  return result;
}

export function dismissNightlyUpdate(): void {
  void (async () => {
    const release = await fetchJson<GhRelease>(
      `https://api.github.com/repos/${getRepoSlug()}/releases/tags/${NIGHTLY_TAG}`,
    );
    if (release?.published_at) {
      settingsState.lastSeenNightlyPublishedAt = release.published_at;
    }
  })();
}
