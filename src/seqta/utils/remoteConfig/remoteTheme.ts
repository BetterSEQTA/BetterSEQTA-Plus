import browser from "@/lib/browser";
import localforage from "localforage";
import type { CustomTheme } from "@/types/CustomThemes";
import {
  applyLocalSettingsRecord,
  captureSyncableSettingsSnapshot,
} from "@/seqta/utils/cloudSettingsSync";
import { settingsState, initializeSettingsState } from "@/seqta/utils/listeners/SettingsState";
import { syncThemeToPage } from "@/seqta/utils/patchThemeImagesPageContext";
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
  layerIds: string[];
  mode: "optional" | "forced";
  applicationMode: "replace" | "overlay";
};

type RemotePackage = {
  theme?: Record<string, unknown>;
  overlayLayers?: Record<string, unknown>[];
  downloadUrl?: string;
};

let reconcileChain: Promise<void> = Promise.resolve();

function directiveKey(snapshot: RemoteConfigSnapshot, d: RemoteThemeDirective): string {
  return `${snapshot.configVersion}|${d.packageId}|${d.packageVersion}|${d.mode}|${d.applicationMode ?? "replace"}`;
}

function isWithinWindow(d: RemoteThemeDirective, now = Date.now()): boolean {
  if (d.activeFrom && !Number.isNaN(Date.parse(d.activeFrom)) && now < Date.parse(d.activeFrom)) {
    return false;
  }
  if (d.activeTo && !Number.isNaN(Date.parse(d.activeTo)) && now > Date.parse(d.activeTo)) {
    return false;
  }
  return true;
}

export function resolveEffectiveRemoteTheme(
  snapshot: RemoteConfigSnapshot,
): RemoteThemeDirective | null {
  const d = snapshot.remoteTheme;
  if (!d || d.mode === "off" || !isWithinWindow(d)) return null;
  return d;
}

async function readJson<T>(key: string): Promise<T | null> {
  const stored = await browser.storage.local.get(key);
  const raw = stored[key];
  return raw && typeof raw === "object" ? (raw as T) : null;
}

async function loadBeforeSnapshot(): Promise<BeforeSnapshot | null> {
  const b = await readJson<BeforeSnapshot>(BSPLUS_REMOTE_THEME_BEFORE_V1_KEY);
  if (!b?.directiveKey || !b.storage) return null;
  return b;
}

async function loadActiveState(): Promise<ActiveThemeState | null> {
  return readJson<ActiveThemeState>(BSPLUS_REMOTE_THEME_STATE_V1_KEY);
}

async function loadUserOffKey(): Promise<string | null> {
  const raw = await readJson<{ directiveKey?: string }>(BSPLUS_REMOTE_THEME_USER_OFF_KEY);
  return typeof raw?.directiveKey === "string" ? raw.directiveKey : null;
}

async function clearRemoteThemeLocalState(): Promise<void> {
  await browser.storage.local.remove([
    BSPLUS_REMOTE_THEME_BEFORE_V1_KEY,
    BSPLUS_REMOTE_THEME_STATE_V1_KEY,
    BSPLUS_REMOTE_THEME_USER_OFF_KEY,
  ]);
}

async function clearRemoteThemeOverlay(state?: ActiveThemeState | null): Promise<void> {
  const active = state ?? (await loadActiveState());
  await syncThemeToPage({ clearOverlay: true });
  if (!active?.layerIds?.length) return;
  const { ThemeManager } = await import("@/plugins/built-in/themes/theme-manager");
  const tm = ThemeManager.getInstance();
  for (const id of active.layerIds) {
    await tm.deleteTheme(id).catch(() => {});
  }
}

export async function dismissOptionalRemoteTheme(snapshot: RemoteConfigSnapshot): Promise<void> {
  const d = resolveEffectiveRemoteTheme(snapshot);
  if (!d || d.mode !== "optional") return;
  await browser.storage.local.set({
    [BSPLUS_REMOTE_THEME_USER_OFF_KEY]: { directiveKey: directiveKey(snapshot, d) },
  });
  await restoreRemoteThemeSnapshot();
}

async function restoreRemoteThemeSnapshot(): Promise<void> {
  const state = await loadActiveState();
  if (state?.applicationMode === "overlay") {
    await clearRemoteThemeOverlay(state);
    await clearRemoteThemeLocalState();
    return;
  }
  const before = await loadBeforeSnapshot();
  if (before) {
    await applyLocalSettingsRecord(before.storage);
    await initializeSettingsState();
    const { ThemeManager } = await import("@/plugins/built-in/themes/theme-manager");
    const tm = ThemeManager.getInstance();
    if (before.selectedTheme) await tm.setTheme(before.selectedTheme, false);
    else await tm.disableTheme();
  }
  await clearRemoteThemeLocalState();
}

async function fetchPackage(packageId: string): Promise<RemotePackage | null> {
  try {
    const res = (await browser.runtime.sendMessage({
      type: "fetchRemoteThemePackage",
      packageId,
    })) as { package?: RemotePackage; error?: string };
    return res?.package && !res.error ? res.package : null;
  } catch {
    return null;
  }
}

async function fetchDownload(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = (await browser.runtime.sendMessage({
      type: "fetchRemoteThemePackageUrl",
      url,
    })) as { theme?: Record<string, unknown> };
    return res?.theme && typeof res.theme === "object" ? res.theme : null;
  } catch {
    return null;
  }
}

async function resolveLayers(pkg: RemotePackage): Promise<Record<string, unknown>[]> {
  if (Array.isArray(pkg.overlayLayers) && pkg.overlayLayers.length) {
    return pkg.overlayLayers.filter((l) => l && typeof l === "object") as Record<string, unknown>[];
  }
  if (pkg.theme && typeof pkg.theme === "object") return [pkg.theme];
  if (!pkg.downloadUrl) return [];
  const dl = await fetchDownload(pkg.downloadUrl);
  if (!dl) return [];
  if (Array.isArray((dl as { overlayLayers?: unknown }).overlayLayers)) {
    return (dl as { overlayLayers: Record<string, unknown>[] }).overlayLayers;
  }
  return [dl];
}

async function saveActiveState(state: ActiveThemeState): Promise<void> {
  await browser.storage.local.set({ [BSPLUS_REMOTE_THEME_STATE_V1_KEY]: state });
  await browser.storage.local.remove(BSPLUS_REMOTE_THEME_USER_OFF_KEY);
}

async function applyRemoteTheme(
  snapshot: RemoteConfigSnapshot,
  directive: RemoteThemeDirective,
): Promise<void> {
  const key = directiveKey(snapshot, directive);
  const prior = await loadActiveState();
  if (prior?.directiveKey === key) return;

  const overlay = (directive.applicationMode ?? "replace") === "overlay";
  if (prior?.applicationMode === "overlay") await clearRemoteThemeOverlay(prior);

  const pkg = await fetchPackage(directive.packageId);
  if (!pkg) return;

  const layers = await resolveLayers(pkg);
  const { ThemeManager } = await import("@/plugins/built-in/themes/theme-manager");
  const tm = ThemeManager.getInstance();

  if (overlay) {
    if (!layers.length) return;
    for (const layer of layers) {
      if (typeof layer.id !== "string" || !layer.name) continue;
      await tm.installTheme(layer as Parameters<typeof tm.installTheme>[0], { fromStore: false });
    }
    if (settingsState.selectedTheme) await tm.setTheme(settingsState.selectedTheme, false);

    const css: string[] = [];
    const images = new Map<string, { variableName: string; blob: Blob }>();
    const layerIds: string[] = [];
    for (const layer of layers) {
      if (typeof layer.id === "string") layerIds.push(layer.id);
      if (typeof layer.CustomCSS === "string") css.push(layer.CustomCSS);
      const stored = typeof layer.id === "string"
        ? ((await localforage.getItem(layer.id)) as CustomTheme | null)
        : null;
      for (const img of stored?.CustomImages ?? []) {
        if (img.variableName && img.blob) images.set(img.variableName, img);
      }
    }
    await syncThemeToPage({
      overlayCss: css.join("\n"),
      overlayImages: [...images.values()],
    });
    await saveActiveState({
      directiveKey: key,
      layerIds,
      mode: directive.mode,
      applicationMode: "overlay",
    });
    return;
  }

  const theme = layers[0];
  if (!theme || typeof theme.id !== "string") return;

  await captureBeforeSnapshot(key);
  await tm.installTheme(theme as Parameters<typeof tm.installTheme>[0], {
    fromStore: false,
    forceTheme: directive.mode === "forced",
  });
  await tm.setTheme(String(theme.id), false);
  await saveActiveState({
    directiveKey: key,
    layerIds: [String(theme.id)],
    mode: directive.mode,
    applicationMode: "replace",
  });
}

async function captureBeforeSnapshot(directiveKey: string): Promise<void> {
  const existing = await loadBeforeSnapshot();
  if (existing?.directiveKey === directiveKey) return;
  await browser.storage.local.set({
    [BSPLUS_REMOTE_THEME_BEFORE_V1_KEY]: {
      capturedAt: new Date().toISOString(),
      directiveKey,
      storage: await captureSyncableSettingsSnapshot(),
      selectedTheme: settingsState.selectedTheme ?? "",
    },
  });
}

async function reconcileRemoteThemeInner(snapshot: RemoteConfigSnapshot): Promise<void> {
  const d = resolveEffectiveRemoteTheme(snapshot);
  if (!d) {
    if (await loadActiveState()) await restoreRemoteThemeSnapshot();
    return;
  }
  const key = directiveKey(snapshot, d);
  if (d.mode === "optional" && (await loadUserOffKey()) === key) return;
  await applyRemoteTheme(snapshot, d);
}

export function scheduleReconcileRemoteTheme(snapshot: RemoteConfigSnapshot): void {
  reconcileChain = reconcileChain
    .then(() => reconcileRemoteThemeInner(snapshot))
    .catch((e) => console.warn("[BetterSEQTA+] remote theme reconcile failed:", e));
}
