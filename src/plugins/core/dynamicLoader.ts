import type { Plugin, PluginSettings } from "./types";
import { verboseInfo } from "@/utils/verboseLog";

export interface LazyPlugin<T extends PluginSettings = PluginSettings, S = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  settings: T;
  styles?: string;
  disableToggle?: boolean;
  defaultEnabled?: boolean;
  beta?: boolean;
  loader: () => Promise<{ default: Plugin<T, S> }>;
}

const ASSET_LOAD_ERRORS = ["MIME type", "NS_ERROR_CORRUPTED_CONTENT", "preload CSS"];

function isAssetLoadError(error: unknown): boolean {
  const msg = (error as { message?: string })?.message ?? "";
  return ASSET_LOAD_ERRORS.some((token) => msg.includes(token));
}

export function createLazyPlugin<T extends PluginSettings = PluginSettings, S = any>(
  lazyPlugin: LazyPlugin<T, S>,
): Plugin<T, S> {
  const { loader, ...meta } = lazyPlugin;
  return {
    ...meta,
    run: async (api) => {
      verboseInfo(`[BetterSEQTA+] Dynamically loading plugin "${lazyPlugin.id}"...`);
      try {
        const { default: actualPlugin } = await loader();
        verboseInfo(`[BetterSEQTA+] Successfully loaded plugin "${lazyPlugin.id}"`);
        return await actualPlugin.run(api);
      } catch (error) {
        if (isAssetLoadError(error)) {
          console.error(
            `[BetterSEQTA+] Failed to load plugin "${lazyPlugin.id}" due to module/asset loading restrictions:`,
            error,
          );
          return;
        }
        console.error(`[BetterSEQTA+] Failed to dynamically load plugin "${lazyPlugin.id}":`, error);
        throw error;
      }
    },
  };
}

export function defineLazyPlugin<T extends PluginSettings = PluginSettings, S = any>(
  config: LazyPlugin<T, S>,
): Plugin<T, S> {
  return createLazyPlugin(config);
}
