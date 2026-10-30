import { checkRemoteFeature } from "./runtime";

export const ROUTE_STRIP_KEEP_PLUGINS = new Set(["themes", "animated-background"]);

export function parseSeqtaPageKeyFromHash(hash = location.hash): string | null {
  const match =
    hash.match(/[#?]page=\/([^/?&#]+)/i) ?? hash.match(/page=\/([^/?&#]+)/i);
  if (!match?.[1]) return null;
  return match[1].trim().toLowerCase();
}

export function isRemoteRouteEnhancementsStripped(pageKey?: string | null): boolean {
  const key = pageKey ?? parseSeqtaPageKeyFromHash();
  if (!key) return false;
  return checkRemoteFeature(`page.${key}`).mode === "block";
}

export function remoteChromeGateAllowed(
  key: "ui.sidebar.styled" | "ui.titlebar.custom" | "ui.titlebar.founderBadge",
): boolean {
  const mode = checkRemoteFeature(key).mode;
  return mode !== "hide" && mode !== "block";
}

export async function syncRouteEnhancementChrome(): Promise<void> {
  if (isRemoteRouteEnhancementsStripped()) {
    const { clearNativeSidebar } = await import("@/seqta/ui/sidebar/applyNativeSidebar");
    clearNativeSidebar();
    const { unmountCustomTitleBar } = await import("@/seqta/ui/titlebar/mountCustomTitleBar");
    unmountCustomTitleBar();
    const { pluginManager } = await import("@/plugins/index");
    await pluginManager.stopPluginsExcept(ROUTE_STRIP_KEEP_PLUGINS);
    return;
  }

  if (remoteChromeGateAllowed("ui.sidebar.styled")) {
    const { applyNativeSidebar } = await import("@/seqta/ui/sidebar/applyNativeSidebar");
    await applyNativeSidebar();
  }
  if (remoteChromeGateAllowed("ui.titlebar.custom")) {
    const { mountCustomTitleBar } = await import("@/seqta/ui/titlebar/mountCustomTitleBar");
    void mountCustomTitleBar();
  }
  const { pluginManager } = await import("@/plugins/index");
  await pluginManager.startAllPlugins();
}
