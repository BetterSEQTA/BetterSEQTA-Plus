import browser from "webextension-polyfill";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { addExtensionSettings } from "@/seqta/utils/Adders/AddExtensionSettings";
import { setupSettingsButton } from "@/seqta/utils/setupSettingsButton";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { isPerformanceMode } from "@/seqta/utils/performanceMode";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  BSPLUS_CAMPAIGN_SEEN_KEY,
  BSPLUS_FEATURES_HIDDEN_UNTIL_VERSION_KEY,
  BSPLUS_LOCAL_OVERRIDE_ONOFF_KEY,
  BSPLUS_REMOTE_CONFIG_LAST_HOSTNAME_KEY,
  BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY,
} from "./storageKeys";
import { normalizeRemoteConfigSnapshot } from "./normalize";
import type { CampaignSeenRecord, RemoteConfigSnapshot } from "./types";
import {
  computeEffectiveEnabled,
  getFeatureMessage,
  isExtensionVersionBelowMinimum,
  isRemoteFeatureAllowed,
  resolveFeatureMode,
  shouldHideFeature,
} from "./apply";

let snapshot: RemoteConfigSnapshot = normalizeRemoteConfigSnapshot(null);
let localOverride = false;
let hiddenUntilVersion: Record<string, string> = {};
let campaignSeen: CampaignSeenRecord = {};

const SNAPSHOT_FETCH_TIMEOUT_MS = 200;

export function getRemoteConfigSnapshot(): RemoteConfigSnapshot {
  return snapshot;
}

export function getHiddenUntilVersion(): Record<string, string> {
  return hiddenUntilVersion;
}

export function getCampaignSeen(): CampaignSeenRecord {
  return campaignSeen;
}

export function isEffectiveBsplusEnabled(userOnoff = settingsState.onoff !== false): boolean {
  return computeEffectiveEnabled(userOnoff, snapshot, localOverride, location.hostname);
}

export function isRemoteKillActive(): boolean {
  return snapshot.global.mode === "off";
}

export function isRemoteThemeStoreDisabled(): boolean {
  return snapshot.global.disableThemeStore === true;
}

export function isRemoteFeedbackSubmitDisabled(): boolean {
  return snapshot.global.disableFeedbackSubmit === true;
}

export async function setLocalOverrideOnoff(enabled: boolean): Promise<void> {
  localOverride = enabled;
  await browser.storage.local.set({ [BSPLUS_LOCAL_OVERRIDE_ONOFF_KEY]: enabled });
}

function applyRemoteRuntime(
  next: RemoteConfigSnapshot,
  override: boolean,
  hidden: Record<string, string>,
  seen: CampaignSeenRecord,
): void {
  snapshot = next;
  localOverride = override;
  hiddenUntilVersion = hidden;
  campaignSeen = seen;
  pinTempHideVersions(next);
}

function pinTempHideVersions(next: RemoteConfigSnapshot): void {
  let changed = false;
  for (const [key, gate] of Object.entries(next.features)) {
    if (gate.mode === "temp_hide" && hiddenUntilVersion[key] !== next.configVersion) {
      hiddenUntilVersion = { ...hiddenUntilVersion, [key]: next.configVersion };
      changed = true;
    }
  }
  if (changed) {
    void browser.storage.local.set({
      [BSPLUS_FEATURES_HIDDEN_UNTIL_VERSION_KEY]: hiddenUntilVersion,
    });
  }
}

export async function hydrateRemoteConfigFromStorage(): Promise<RemoteConfigSnapshot> {
  const stored = await browser.storage.local.get([
    BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY,
    BSPLUS_LOCAL_OVERRIDE_ONOFF_KEY,
    BSPLUS_FEATURES_HIDDEN_UNTIL_VERSION_KEY,
    BSPLUS_CAMPAIGN_SEEN_KEY,
  ]);

  let raw = stored[BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY];
  if (!raw) {
    try {
      const res = (await Promise.race([
        browser.runtime.sendMessage({ type: "getRemoteConfigSnapshot" }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), SNAPSHOT_FETCH_TIMEOUT_MS)),
      ])) as { snapshot?: unknown } | null;
      if (res?.snapshot) raw = res.snapshot;
    } catch {
      // SW unavailable
    }
    void browser.runtime.sendMessage({ type: "refreshRemoteConfig" }).catch(() => {});
  }

  applyRemoteRuntime(
    normalizeRemoteConfigSnapshot(raw),
    stored[BSPLUS_LOCAL_OVERRIDE_ONOFF_KEY] === true,
    (stored[BSPLUS_FEATURES_HIDDEN_UNTIL_VERSION_KEY] as Record<string, string>) ?? {},
    (stored[BSPLUS_CAMPAIGN_SEEN_KEY] as CampaignSeenRecord) ?? {},
  );
  return snapshot;
}

export function notifyRemoteConfigPageContext(hostname: string): void {
  void browser.storage.local.set({ [BSPLUS_REMOTE_CONFIG_LAST_HOSTNAME_KEY]: hostname });
  void browser.runtime
    .sendMessage({ type: "setRemoteConfigPageContext", hostname })
    .catch(() => {});
}

export async function markCampaignSeen(campaignId: string, ack?: boolean): Promise<void> {
  campaignSeen = {
    ...campaignSeen,
    [campaignId]: { seenAt: new Date().toISOString(), ack },
  };
  await browser.storage.local.set({ [BSPLUS_CAMPAIGN_SEEN_KEY]: campaignSeen });
}

const REMOTE_STORAGE_WATCH_KEYS = new Set([
  BSPLUS_REMOTE_CONFIG_SNAPSHOT_KEY,
  BSPLUS_LOCAL_OVERRIDE_ONOFF_KEY,
  BSPLUS_FEATURES_HIDDEN_UNTIL_VERSION_KEY,
]);

export function installRemoteConfigStorageListener(onEffectiveChange: () => void): void {
  let priorEnabled = isEffectiveBsplusEnabled();
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!Object.keys(changes).some((k) => REMOTE_STORAGE_WATCH_KEYS.has(k))) return;
    void hydrateRemoteConfigFromStorage().then(() => {
      const next = isEffectiveBsplusEnabled();
      if (next !== priorEnabled) {
        priorEnabled = next;
        onEffectiveChange();
      }
    });
  });
}

export function checkRemoteFeature(key: string) {
  const hidden = hiddenUntilVersion;
  return {
    mode: resolveFeatureMode(key, snapshot, hidden),
    allowed: isRemoteFeatureAllowed(key, snapshot, hidden),
    hide: shouldHideFeature(key, snapshot, hidden),
    message: getFeatureMessage(key, snapshot),
  };
}

export function isRemoteSettingsSectionVisible(sectionId: string): boolean {
  const key =
    sectionId === "account" ? "settings.nav.cloud" : `settings.section.${sectionId}`;
  return !checkRemoteFeature(key).hide;
}

export function isRemotePluginStartAllowed(pluginId: string): boolean {
  const remote = checkRemoteFeature(`plugin.${pluginId}`);
  if (remote.hide || remote.mode === "greyout" || remote.mode === "block") return false;
  if (isExtensionVersionBelowMinimum(snapshot)) return false;
  return remote.allowed;
}

/** Returns true when navigation should stop (hide or block). */
export function applyPageFeatureGateEarly(page: string): boolean {
  const gate = checkRemoteFeature(`page.${page}`);
  if (gate.hide) return true;
  if (gate.mode !== "block") return false;

  const main = document.getElementById("main");
  if (main) {
    const title = gate.message?.title ?? "Page unavailable";
    const body = gate.message?.body ?? "This BetterSEQTA+ page is temporarily unavailable.";
    main.innerHTML = "";
    main.append(
      stringToHTML(
        /* html */ `<div class="home-root"><div class="home-container"><h1 class="bsplus-rounded">${title}</h1><p>${body}</p></div></div>`,
      ).firstChild!,
    );
  }
  return true;
}

export function injectPageFeatureBanner(page: string, containerSelector: string): void {
  const gate = checkRemoteFeature(`page.${page}`);
  if (gate.mode !== "banner" || !gate.message?.body) return;
  const container = document.querySelector(containerSelector);
  if (!container || container.querySelector(`[data-bsplus-page-banner="${page}"]`)) return;

  const severity = gate.message.severity ?? "info";
  container.insertBefore(
    stringToHTML(/* html */ `
      <div data-bsplus-page-banner="${page}" class="bsplus-remote-page-banner bsplus-remote-page-banner--${severity} mb-4 rounded-lg border px-4 py-3 text-sm">
        ${gate.message.title ? `<p class="font-semibold mb-1">${gate.message.title}</p>` : ""}
        <p>${gate.message.body}</p>
      </div>
    `).firstChild!,
    container.firstChild,
  );
}

/** Remote kill path: settings popup + toolbar cog without monofile. */
export async function ensureKilledModeSettingsAccess(): Promise<void> {
  addExtensionSettings();
  if (document.getElementById("AddedSettings")) {
    setupSettingsButton();
    return;
  }

  const fallback =
    document.getElementById("content") ??
    document.getElementById("container") ??
    document.body;

  const mountParent = async (): Promise<Element> => {
    if (isSeqtaEngageExperience()) {
      try {
        const el = await waitForElm(
          "#content > div.connectedNotificationsWrapper > div",
          true,
          100,
          40,
        );
        return el.parentElement ?? el;
      } catch {
        return fallback;
      }
    }
    try {
      return await waitForElm(
        "#content > div.connectedNotificationsWrapper",
        true,
        isPerformanceMode() ? 120 : 80,
        50,
      );
    } catch {
      return fallback;
    }
  };

  mountParent().then((parent) => {
    if (document.getElementById("AddedSettings")) return;
    parent.append(
      stringToHTML(/* html */ `
        <button class="addedButton tooltip" id="AddedSettings" type="button" aria-label="BetterSEQTA+ settings">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z"></path>
            <path d="M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z"></path>
          </svg>
          <div class="tooltiptext topmenutooltip">BetterSEQTA+ Settings</div>
        </button>
      `).firstChild!,
    );
    setupSettingsButton();
  });
}
