import browser from "webextension-polyfill";
import { unmount } from "svelte";
import type { Plugin } from "@/plugins/core/types";
import renderSvelte from "@/interface/main";
import { syncPageThemeToElement } from "@/interface/utils/syncPageTheme";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import FloatingModCreator from "./FloatingModCreator.svelte";
import { ModRuntime } from "./modRuntime";
import { createCreatorServices } from "./services";
import { AI_MODS_STORAGE_KEY, loadStoredMods } from "./storage";
import { aiModLog } from "./logger";

const HOST_ATTRIBUTE = "data-bsplus-ai-mod-creator-host";

async function mountCreator(): Promise<() => void> {
  document.querySelector(`[${HOST_ATTRIBUTE}]`)?.remove();

  const host = document.createElement("div");
  host.setAttribute(HOST_ATTRIBUTE, "");
  Object.assign(host.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    zIndex: "2147483647",
  });
  document.body.appendChild(host);
  syncPageThemeToElement(host);

  const shadow = host.attachShadow({ mode: "open" });
  const services = createCreatorServices();
  const app = renderSvelte(
    FloatingModCreator,
    shadow,
    { services },
    "content",
  );

  const runtime = new ModRuntime();
  runtime.start();
  let activeAdvancedScripts = new Map<string, number>();

  const currentRoute = () => {
    const path = window.location.hash.split("?page=/")[1] ?? "";
    return path.split(/[/?#]/)[0];
  };

  const syncMods = async () => {
    const mods = await loadStoredMods();
    aiModLog.debug("plugin", "Syncing stored mods", {
      count: mods.length,
      route: currentRoute(),
    });
    runtime.setRecipes(mods);
    const route = currentRoute();
    const nextAdvanced = mods.filter(
      (mod) =>
        mod.enabled &&
        Boolean(mod.advancedScript) &&
        (!mod.route || mod.route === route),
    );
    const nextIds = new Set(nextAdvanced.map((mod) => mod.id));

    await Promise.all(
      [...activeAdvancedScripts.keys()]
        .filter((id) => !nextIds.has(id))
        .map((id) =>
          services.stopAdvancedScript(id).catch((error) => {
            aiModLog.warn("plugin", `Failed to stop AI mod ${id}`, error);
          }),
        ),
    );

    for (const mod of nextAdvanced) {
      if (activeAdvancedScripts.get(mod.id) === mod.updatedAt) continue;
      try {
        await services.executeAdvancedScript(mod);
        aiModLog.info("plugin", `Started advanced mod ${mod.id}`);
      } catch (error) {
        aiModLog.warn("plugin", `Failed to execute advanced AI mod ${mod.id}`, error);
      }
    }
    activeAdvancedScripts = new Map(
      nextAdvanced.map((mod) => [mod.id, mod.updatedAt]),
    );
  };

  await syncMods();

  const onStorageChanged = (
    changes: Record<string, browser.Storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local" || !changes[AI_MODS_STORAGE_KEY]) return;
    void syncMods();
  };
  browser.storage.onChanged.addListener(onStorageChanged);
  window.addEventListener("hashchange", syncMods);

  const themeObserver = new MutationObserver(() => syncPageThemeToElement(host));
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const syncTheme = () => syncPageThemeToElement(host);
  settingsState.register("DarkMode", syncTheme);
  settingsState.register("selectedColor", syncTheme);

  return () => {
    settingsState.unregister("DarkMode", syncTheme);
    settingsState.unregister("selectedColor", syncTheme);
    themeObserver.disconnect();
    browser.storage.onChanged.removeListener(onStorageChanged);
    window.removeEventListener("hashchange", syncMods);
    for (const id of activeAdvancedScripts.keys()) {
      void services.stopAdvancedScript(id).catch((error) => {
        console.warn(`[BetterSEQTA+] Failed to stop AI mod ${id}:`, error);
      });
    }
    activeAdvancedScripts = new Map();
    runtime.stop();
    unmount(app);
    host.remove();
  };
}

const aiModCreatorPlugin: Plugin = {
  id: "ai-mod-creator",
  name: "AI Mod Creator",
  description:
    "Developer-only local creator for safe, declarative BetterSEQTA+ page mods.",
  version: "0.1.0",
  settings: {},
  beta: true,
  run: async () => {
    let cleanup: (() => void) | null = null;
    let generation = 0;

    const syncEnabledState = async () => {
      const currentGeneration = ++generation;
      if (!settingsState.devMode) {
        cleanup?.();
        cleanup = null;
        return;
      }
      if (cleanup) return;
      const nextCleanup = await mountCreator();
      if (
        currentGeneration !== generation ||
        !settingsState.devMode
      ) {
        nextCleanup();
        return;
      }
      cleanup = nextCleanup;
    };

    const onDevModeChanged = () => void syncEnabledState();
    settingsState.register("devMode", onDevModeChanged);
    await syncEnabledState();

    return () => {
      generation += 1;
      settingsState.unregister("devMode", onDevModeChanged);
      cleanup?.();
      cleanup = null;
    };
  },
};

export default aiModCreatorPlugin;
