import browser from "webextension-polyfill";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import type {
  BooleanSetting,
  ButtonSetting,
  ComponentSetting,
  HotkeySetting,
  NumberSetting,
  SelectSetting,
  StringSetting,
} from "@/plugins/core/types";

type SettingType =
  | (Omit<BooleanSetting, "type"> & { type: "boolean"; id: string })
  | (Omit<StringSetting, "type"> & { type: "string"; id: string })
  | (Omit<NumberSetting, "type"> & { type: "number"; id: string })
  | (Omit<SelectSetting<string>, "type"> & {
      type: "select";
      id: string;
      options: string[];
    })
  | (Omit<ButtonSetting, "type"> & { type: "button"; id: string })
  | (Omit<HotkeySetting, "type"> & { type: "hotkey"; id: string })
  | (Omit<ComponentSetting, "type"> & {
      type: "component";
      id: string;
      component: unknown;
    });

export type PluginSettingsEntry = {
  pluginId: string;
  name: string;
  description: string;
  beta?: boolean;
  settings: Record<string, SettingType>;
  disableToggle?: boolean;
};

let loadPromise: Promise<void> | null = null;

class PluginSettingsStore {
  loaded = $state(false);
  loading = $state(false);
  plugins = $state<PluginSettingsEntry[]>([]);
  values = $state<Record<string, Record<string, unknown>>>({});

  ensureLoaded(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    if (loadPromise) return loadPromise;

    this.loading = true;
    loadPromise = this.load().finally(() => {
      this.loading = false;
      this.loaded = true;
    });
    return loadPromise;
  }

  private async load(): Promise<void> {
    const { getAllPluginSettings } = await import("@/plugins");
    this.plugins = getAllPluginSettings().filter(
      (plugin) =>
        !(isSeqtaEngageExperience() && plugin.pluginId === "global-search"),
    ) as PluginSettingsEntry[];

    for (const plugin of this.plugins) {
      if (Object.keys(plugin.settings).length === 0) continue;

      const storageKey = `plugin.${plugin.pluginId}.settings`;
      const stored = await browser.storage.local.get(storageKey);
      this.values[plugin.pluginId] = (stored[storageKey] as Record<string, unknown>) || {};

      for (const [key, setting] of Object.entries(plugin.settings)) {
        if (
          this.values[plugin.pluginId][key] === undefined &&
          setting.type !== "button" &&
          setting.type !== "component"
        ) {
          this.values[plugin.pluginId][key] = setting.default;
        }
      }
    }
  }

  async update(pluginId: string, key: string, value: unknown): Promise<void> {
    await this.ensureLoaded();

    if (!this.values[pluginId]) {
      this.values[pluginId] = {};
    }
    this.values[pluginId][key] = value;

    const storageKey = `plugin.${pluginId}.settings`;
    const stored = await browser.storage.local.get(storageKey);
    const currentSettings = (stored[storageKey] || {}) as Record<string, unknown>;
    currentSettings[key] = value;
    await browser.storage.local.set({ [storageKey]: currentSettings });
  }
}

export const pluginSettingsStore = new PluginSettingsStore();
