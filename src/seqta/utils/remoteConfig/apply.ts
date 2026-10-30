import type { FeatureMode, RemoteConfigSnapshot, RemoteFeatureGate } from "./types";
import { DEFAULT_REMOTE_CONFIG } from "./normalize";
import semver from "semver";
import browser from "webextension-polyfill";

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

export function isHostnameAllowedByPolicy(
  snapshot: RemoteConfigSnapshot,
  hostname: string,
): boolean {
  const policy = snapshot.global.hostnamePolicy;
  if (!policy?.suffixes?.length) return true;
  const host = normalizeHostname(hostname);
  const suffixes = policy.suffixes.map((s) => normalizeHostname(s));
  const matches = suffixes.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
  if (policy.mode === "denylist") return !matches;
  if (policy.mode === "allowlist") return matches;
  return true;
}

export function isExtensionVersionBelowMinimum(snapshot: RemoteConfigSnapshot): boolean {
  const min = snapshot.global.minExtensionVersion;
  if (!min || !semver.valid(min)) return false;
  const current = browser.runtime.getManifest().version;
  if (!semver.valid(current)) return false;
  return semver.lt(current, min);
}

export function getMinVersionStatusMessage(snapshot: RemoteConfigSnapshot): string | null {
  if (!isExtensionVersionBelowMinimum(snapshot)) return null;
  const min = snapshot.global.minExtensionVersion;
  const url = snapshot.global.forceUpdateUrl;
  const base = `BetterSEQTA+ ${min ?? "a newer version"} or later is required for full features.`;
  return url ? `${base} Update: ${url}` : base;
}

export function computeEffectiveEnabled(
  userOnoff: boolean,
  snapshot: RemoteConfigSnapshot,
  localOverride: boolean,
  hostname = typeof location !== "undefined" ? location.hostname : "",
): boolean {
  if (!userOnoff) return false;
  if (!isHostnameAllowedByPolicy(snapshot, hostname)) {
    if (snapshot.global.allowLocalOverride === false) return false;
    return localOverride;
  }
  if (snapshot.global.mode !== "off") return true;
  if (snapshot.global.allowLocalOverride === false) return false;
  return localOverride;
}

export function getRemoteStatusMessage(snapshot: RemoteConfigSnapshot): string | null {
  const minMsg = getMinVersionStatusMessage(snapshot);
  if (minMsg) return minMsg;
  if (snapshot.global.mode === "off" && snapshot.global.statusMessage) {
    return snapshot.global.statusMessage;
  }
  const maint = snapshot.global.maintenance;
  if (maint?.body) return maint.body;
  if (maint?.title) return maint.title;
  if (!isHostnameAllowedByPolicy(snapshot, typeof location !== "undefined" ? location.hostname : "")) {
    return "BetterSEQTA+ is not enabled for this SEQTA site.";
  }
  return snapshot.global.mode === "off"
    ? "BetterSEQTA+ is temporarily disabled by the site operator."
    : null;
}

export function resolveFeatureMode(
  key: string,
  snapshot: RemoteConfigSnapshot = DEFAULT_REMOTE_CONFIG,
  hiddenUntilVersion: Record<string, string> = {},
): FeatureMode {
  const gate: RemoteFeatureGate | undefined = snapshot.features[key];
  if (!gate?.mode || gate.mode === "allow") return "allow";
  if (gate.mode === "temp_hide") {
    const pinned = hiddenUntilVersion[key];
    if (pinned && pinned === snapshot.configVersion) return "hide";
    return "allow";
  }
  return gate.mode;
}

export function isRemoteFeatureAllowed(
  key: string,
  snapshot: RemoteConfigSnapshot,
  hiddenUntilVersion: Record<string, string> = {},
): boolean {
  const mode = resolveFeatureMode(key, snapshot, hiddenUntilVersion);
  return mode === "allow" || mode === "banner";
}

export function shouldHideFeature(
  key: string,
  snapshot: RemoteConfigSnapshot,
  hiddenUntilVersion: Record<string, string> = {},
): boolean {
  return resolveFeatureMode(key, snapshot, hiddenUntilVersion) === "hide";
}

export function getFeatureMessage(
  key: string,
  snapshot: RemoteConfigSnapshot,
): RemoteFeatureGate["message"] | undefined {
  return snapshot.features[key]?.message;
}
