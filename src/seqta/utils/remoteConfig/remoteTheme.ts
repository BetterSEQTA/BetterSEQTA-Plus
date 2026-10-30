import browser from "webextension-polyfill";
import {
  applyLocalSettingsRecord,
  captureSyncableSettingsSnapshot,
} from "@/seqta/utils/cloudSettingsSync";
import { settingsState, initializeSettingsState } from "@/seqta/utils/listeners/SettingsState";
import type { RemoteConfigSnapshot, RemoteThemeDirective } from "./types";
import {
  BSPLUS_REMOTE_THEME_BEFORE_V1_KEY,
  BSPLUS_REMOTE_THEME_STATE_V1_KEY,
  BSPLUS_REMOTE_THEME_USER_OFF_KEY,
} from "./storageKeys";

type BeforeSnapshot = {
  capturedAt: string;
  directiveKey: string;
  storage: Record<string, unknown>;
  selectedTheme: string;
};

type ActiveThemeState = {
  directiveKey: string;
  packageId: string;
  installedThemeId: string;
  mode: "optional" | "forced";
};

export type RemoteThemePackageResponse = {
  packageId: string;
  version: string;
  theme?: Record<string, unknown>;
  downloadUrl?: string;
};

let reconcileChain: Promise<void> = Promise.resolve();

function remoteThemeDirectiveKey(
  snapshot: RemoteConfigSnapshot,
  directive: RemoteThemeDirective,
): string {
  return `${snapshot.configVersion}|${directive.packageId}|${directive.packageVersion}|${directive.mode}`;
}

function isWithinWindow(directive: RemoteThemeDirective, now = Date.now()): boolean {
  if (directive.activeFrom) {
    const from = Date.parse(directive.activeFrom);
    if (!Number.isNaN(from) && now < from) return false;
  }
  if (directive.activeTo) {
    const until = Date.parse(directive.activeTo);
    if (!Number.isNaN(until) && now > until) return false;
  }
  return true;
}

export function resolveEffectiveRemoteTheme(
  snapshot: RemoteConfigSnapshot,
): RemoteThemeDirective | null {
  const d = snapshot.remoteTheme;
  if (!d || d.mode === "off") return null;
  if (!isWithinWindow(d)) return null;
  return d;
}

async function loadBeforeSnapshot(): Promise<BeforeSnapshot | null> {
  const stored = await browser.storage.local.get(BSPLUS_REMOTE_THEME_BEFORE_V1_KEY);
  const raw = stored[BSPLUS_REMOTE_THEME_BEFORE_V1_KEY];
  if (!raw || typeof raw !== "object") return null;
  const b = raw as BeforeSnapshot;
  if (!b.directiveKey || !b.storage || typeof b.storage !== "object") return null;
  return b;
}

async function captureBeforeSnapshot(directiveKey: string): Promise<void> {
  const existing = await loadBeforeSnapshot();
  if (existing?.directiveKey === directiveKey) return;

  const storage = await captureSyncableSettingsSnapshot();
  const before: BeforeSnapshot = {
    capturedAt: new Date().toISOString(),
    directiveKey,
    storage,
    selectedTheme: settingsState.selectedTheme ?? "",
  };
  await browser.storage.local.set({ [BSPLUS_REMOTE_THEME_BEFORE_V1_KEY]: before });
}

async function clearRemoteThemeLocalState(): Promise<void> {
  await browser.storage.local.remove([
    BSPLUS_REMOTE_THEME_BEFORE_V1_KEY,
    BSPLUS_REMOTE_THEME_STATE_V1_KEY,
    BSPLUS_REMOTE_THEME_USER_OFF_KEY,
  ]);
}

async function loadUserOffKey(): Promise<string | null> {
  const stored = await browser.storage.local.get(BSPLUS_REMOTE_THEME_USER_OFF_KEY);
  const raw = stored[BSPLUS_REMOTE_THEME_USER_OFF_KEY];
  if (!raw || typeof raw !== "object") return null;
  const key = (raw as { directiveKey?: string }).directiveKey;
  return typeof key === "string" ? key : null;
}

export async function dismissOptionalRemoteTheme(snapshot: RemoteConfigSnapshot): Promise<void> {
  const directive = resolveEffectiveRemoteTheme(snapshot);
  if (!directive || directive.mode !== "optional") return;
  const key = remoteThemeDirectiveKey(snapshot, directive);
  await browser.storage.local.set({
    [BSPLUS_REMOTE_THEME_USER_OFF_KEY]: { directiveKey: key },
  });
  await restoreRemoteThemeSnapshot();
}

async function restoreRemoteThemeSnapshot(): Promise<void> {
  const before = await loadBeforeSnapshot();
  if (before) {
    await applyLocalSettingsRecord(before.storage);
    await initializeSettingsState();
    const { ThemeManager } = await import("@/plugins/built-in/themes/theme-manager");
    const tm = ThemeManager.getInstance();
    if (before.selectedTheme) {
      await tm.setTheme(before.selectedTheme, false);
    } else {
      await tm.disableTheme();
    }
  }
  await clearRemoteThemeLocalState();
}

async function fetchPackage(packageId: string): Promise<RemoteThemePackageResponse | null> {
  try {
    const res = (await browser.runtime.sendMessage({
      type: "fetchRemoteThemePackage",
      packageId,
    })) as { package?: RemoteThemePackageResponse; error?: string } | undefined;
    if (res?.error || !res?.package) return null;
    return res.package;
  } catch {
    return null;
  }
}

async function resolveThemeContent(
  pkg: RemoteThemePackageResponse,
): Promise<Record<string, unknown> | null> {
  if (pkg.theme && typeof pkg.theme === "object") return pkg.theme;
  if (!pkg.downloadUrl) return null;
  try {
    const res = (await browser.runtime.sendMessage({
      type: "fetchRemoteThemePackageUrl",
      url: pkg.downloadUrl,
    })) as { theme?: Record<string, unknown>; error?: string };
    if (res?.theme && typeof res.theme === "object") return res.theme;
  } catch {
    /* ignore */
  }
  return null;
}

async function applyRemoteThemePackage(
  snapshot: RemoteConfigSnapshot,
  directive: RemoteThemeDirective,
): Promise<void> {
  const directiveKey = remoteThemeDirectiveKey(snapshot, directive);
  const stored = await browser.storage.local.get(BSPLUS_REMOTE_THEME_STATE_V1_KEY);
  const state = stored[BSPLUS_REMOTE_THEME_STATE_V1_KEY] as ActiveThemeState | undefined;
  if (state?.directiveKey === directiveKey) return;

  await captureBeforeSnapshot(directiveKey);

  const pkg = await fetchPackage(directive.packageId);
  if (!pkg) return;

  const themeContent = await resolveThemeContent(pkg);
  if (!themeContent || typeof themeContent.id !== "string") return;

  const { ThemeManager } = await import("@/plugins/built-in/themes/theme-manager");
  const tm = ThemeManager.getInstance();
  await tm.installTheme(themeContent as Parameters<typeof tm.installTheme>[0], {
    fromStore: false,
    forceTheme: directive.mode === "forced",
  });
  await tm.setTheme(String(themeContent.id), false);

  const active: ActiveThemeState = {
    directiveKey,
    packageId: directive.packageId,
    installedThemeId: String(themeContent.id),
    mode: directive.mode,
  };
  await browser.storage.local.set({ [BSPLUS_REMOTE_THEME_STATE_V1_KEY]: active });
  await browser.storage.local.remove(BSPLUS_REMOTE_THEME_USER_OFF_KEY);
}

async function reconcileRemoteThemeInner(snapshot: RemoteConfigSnapshot): Promise<void> {
  const directive = resolveEffectiveRemoteTheme(snapshot);
  const userOff = await loadUserOffKey();

  if (!directive) {
    const stateRaw = await browser.storage.local.get(BSPLUS_REMOTE_THEME_STATE_V1_KEY);
    if (stateRaw[BSPLUS_REMOTE_THEME_STATE_V1_KEY]) {
      await restoreRemoteThemeSnapshot();
    }
    return;
  }

  const directiveKey = remoteThemeDirectiveKey(snapshot, directive);
  if (directive.mode === "optional" && userOff === directiveKey) {
    return;
  }

  await applyRemoteThemePackage(snapshot, directive);
}

export function scheduleReconcileRemoteTheme(snapshot: RemoteConfigSnapshot): void {
  reconcileChain = reconcileChain
    .then(() => reconcileRemoteThemeInner(snapshot))
    .catch((e) => console.warn("[BetterSEQTA+] remote theme reconcile failed:", e));
}
