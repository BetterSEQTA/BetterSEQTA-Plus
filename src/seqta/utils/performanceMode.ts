import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { removeAnimatedBackgroundLayers } from "@/plugins/built-in/animatedBackground/backgroundLayers";
import { applySidebarLook } from "@/seqta/ui/sidebar/sidebarStyles";
import {
  PERFORMANCE_HEAVY_PLUGIN_IDS,
  PERFORMANCE_HEAVY_PLUGINS,
} from "@/seqta/utils/performanceModeConfig";

export const PERFORMANCE_MODE_CLASS = "performanceMode";
export const SIMPLE_UI_CLASS = "performanceModeSimpleUi";

/** Master toggle — reduces visual effects and background work for smoother SEQTA. */
export function isPerformanceMode(): boolean {
  return settingsState.performanceMode === true;
}

export function isSimpleAnalyticsUi(): boolean {
  return (
    isPerformanceMode() &&
    !isPluginForceEnabledInPerformanceMode("grade-analytics")
  );
}

export function isPluginForceEnabledInPerformanceMode(pluginId: string): boolean {
  return settingsState.performanceModePluginOverrides?.[pluginId] === true;
}

export function isPluginBlockedByPerformanceMode(pluginId: string): boolean {
  if (!isPerformanceMode()) return false;
  if (isPluginForceEnabledInPerformanceMode(pluginId)) return false;
  return PERFORMANCE_HEAVY_PLUGIN_IDS.has(pluginId);
}

export function isPluginAllowedInPerformanceMode(pluginId: string): boolean {
  return !isPluginBlockedByPerformanceMode(pluginId);
}

export function setPerformanceModePluginOverride(
  pluginId: string,
  forceEnable: boolean,
): void {
  const current = { ...(settingsState.performanceModePluginOverrides ?? {}) };
  if (forceEnable) {
    current[pluginId] = true;
  } else {
    delete current[pluginId];
  }
  settingsState.performanceModePluginOverrides = current;
}

export function animationsEnabled(): boolean {
  return settingsState.animations !== false;
}

/** Expensive full-page effects (view transitions, clip-path theme morphs). */
export function fullMotionEffectsEnabled(): boolean {
  return animationsEnabled() && !isPerformanceMode();
}

export function transparencyEnabled(): boolean {
  return !isPerformanceMode() && settingsState.transparencyEffects === true;
}

export function adaptiveThemeTransitionEnabled(): boolean {
  return (
    !isPerformanceMode() &&
    (settingsState.adaptiveThemeColourTransition ?? true)
  );
}

export function globalSearchIndexingEnabled(settingEnabled: boolean): boolean {
  return isPluginAllowedInPerformanceMode("global-search") && settingEnabled;
}

export function applyPerformanceModeClass(): void {
  const on = isPerformanceMode();
  document.documentElement.classList.toggle(PERFORMANCE_MODE_CLASS, on);
  document.documentElement.classList.toggle(SIMPLE_UI_CLASS, isPerformanceMode());
}

export function applyPerformanceModeTransparency(): void {
  if (transparencyEnabled()) {
    document.documentElement.classList.add("transparencyEffects");
  } else {
    document.documentElement.classList.remove("transparencyEffects");
  }
}

export function applyPerformanceModeSidebarLook(): void {
  applySidebarLook(document.getElementById("menu"));
}

async function syncPerformanceModePlugins(): Promise<void> {
  try {
    const { pluginManager } = await import("@/plugins");
    const pluginIds = new Set<string>([
      ...PERFORMANCE_HEAVY_PLUGINS.map((p) => p.id),
      ...Object.keys(settingsState.performanceModePluginOverrides ?? {}),
    ]);

    for (const pluginId of pluginIds) {
      if (isPluginAllowedInPerformanceMode(pluginId)) {
        await pluginManager.startPlugin(pluginId);
      } else {
        await pluginManager.stopPlugin(pluginId);
      }
    }

    if (isPerformanceMode()) {
      removeAnimatedBackgroundLayers();
      window.dispatchEvent(new CustomEvent("betterseqta-background-music-stop"));
    } else {
      const browser = (await import("webextension-polyfill")).default;
      const searchSettings = await browser.storage.local.get(
        "plugin.global-search.settings",
      );
      const gs = searchSettings["plugin.global-search.settings"] as
        | { runIndexingOnLoad?: boolean }
        | undefined;
      if (gs?.runIndexingOnLoad && isPluginAllowedInPerformanceMode("global-search")) {
        const { runIndexing } = await import(
          "@/plugins/built-in/globalSearch/src/indexing/indexer"
        );
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(() => void runIndexing(), { timeout: 5000 });
        } else {
          setTimeout(() => void runIndexing(), 2000);
        }
      }
    }
  } catch (error) {
    console.warn("[BetterSEQTA+] Performance mode plugin sync failed:", error);
  }
}

/** Apply DOM + plugin side effects when performance mode changes or on boot. */
export function syncPerformanceModeEffects(): void {
  applyPerformanceModeClass();
  applyPerformanceModeTransparency();
  applyPerformanceModeSidebarLook();
  void syncPerformanceModePlugins();
}

export { PERFORMANCE_HEAVY_PLUGINS };
