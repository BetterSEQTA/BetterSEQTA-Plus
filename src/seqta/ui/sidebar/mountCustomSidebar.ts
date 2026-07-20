import { mount, unmount } from "svelte";
import type { SettingsState } from "@/types/storage";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { waitForElm } from "@/seqta/utils/waitForElm";
import Sidebar from "./Sidebar.svelte";
import { getNativeMenuList } from "./parseNativeMenu";
import {
  clearNativeDrillActive,
  sidebarState,
} from "./sidebarState.svelte";

const ROOT_ID = "bsplus-sidebar-root";
const MENU_CLASS = "bsplus-custom-sidebar";
const PENDING_CLASS = "bsplus-custom-sidebar-pending";

type ChangeListener = (newValue: unknown, oldValue: unknown) => void;

let app: ReturnType<typeof mount> | null = null;
let menuEl: HTMLElement | null = null;
let menuObserver: MutationObserver | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let hashListenerAttached = false;
let earlyPrepareStarted = false;
let catchupTimer: ReturnType<typeof setInterval> | null = null;
let nativeMenuListenerAttached = false;

function onNativeMenuUpdated() {
  if (menuEl) sidebarState.syncFromNative(menuEl);
}

const settingsListeners: Array<{
  key: keyof SettingsState;
  listener: ChangeListener;
}> = [];

function startCatchupSync() {
  if (catchupTimer) clearInterval(catchupTimer);
  let attempts = 0;
  catchupTimer = setInterval(() => {
    attempts += 1;
    if (menuEl) sidebarState.syncFromNative(menuEl);
    // Plugins (Analytics, Overview, icons) inject shortly after first paint.
    if (attempts >= 60) {
      if (catchupTimer) clearInterval(catchupTimer);
      catchupTimer = null;
    }
  }, 50);
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    if (menuEl) sidebarState.syncFromNative(menuEl);
  }, 50);
}

function onHashChange() {
  sidebarState.syncActiveFromLocation();
  if (menuEl) clearNativeDrillActive(menuEl);

  if (!sidebarState.isDrilling) return;

  const path = sidebarState.activePath;
  if (!path) return;

  const openKey = sidebarState.drillStack[0]?.key;
  const top = sidebarState.visibleRootItems.find(
    (item) =>
      item.key === openKey ||
      item.path === path ||
      (item.path != null && path.startsWith(`${item.path}/`)),
  );

  if (openKey && top?.key === openKey) return;
  if (!path.includes("/")) sidebarState.resetDrill();
}

function ensureDefaultMenuOrder(menu: HTMLElement) {
  const list = getNativeMenuList(menu);
  if (!list) return;
  const keys = [...list.children]
    .map((node) => (node as HTMLElement).dataset.key)
    .filter((key): key is string => !!key);

  if (!settingsState.defaultmenuorder?.length) {
    settingsState.defaultmenuorder = keys;
    return;
  }

  for (const key of keys) {
    if (!settingsState.defaultmenuorder.includes(key)) {
      settingsState.defaultmenuorder = [
        ...settingsState.defaultmenuorder,
        key,
      ];
    }
  }
}

function registerSetting(
  key: keyof SettingsState,
  listener: ChangeListener,
) {
  settingsState.register(key, listener);
  settingsListeners.push({ key, listener });
}

function clearSettingListeners() {
  for (const { key, listener } of settingsListeners) {
    settingsState.unregister(key, listener);
  }
  settingsListeners.length = 0;
}

function clearPendingClass() {
  document.documentElement.classList.remove(PENDING_CLASS);
}

/**
 * Hide the native SEQTA menu immediately (even under the loading overlay)
 * and begin mounting the Svelte sidebar as soon as `#menu` exists.
 */
export function prepareCustomSidebarEarly() {
  if (isSeqtaEngageExperience()) return;
  if (!settingsState.onoff) return;
  if (earlyPrepareStarted) return;

  earlyPrepareStarted = true;
  document.documentElement.classList.add(PENDING_CLASS);
  void mountCustomSidebar();
}

export function openCustomSidebarEditor() {
  if (!app || !menuEl) return false;
  sidebarState.setEditMode(true);
  menuEl.classList.add("bsplus-sidebar-edit-mode");
  return true;
}

export function closeCustomSidebarEditor() {
  sidebarState.setEditMode(false);
  menuEl?.classList.remove("bsplus-sidebar-edit-mode");
  void import("@/seqta/utils/Openers/menuOptionsState").then((mod) => {
    mod.setMenuOptionsOpen(false);
  });
}

export function isCustomSidebarMounted(): boolean {
  return app != null;
}

export async function mountCustomSidebar(): Promise<boolean> {
  if (isSeqtaEngageExperience()) return false;
  if (!settingsState.onoff) return false;

  // Already mounted — re-sync after Home/News/Analytics injections.
  if (app && menuEl) {
    ensureDefaultMenuOrder(menuEl);
    sidebarState.syncSettings();
    sidebarState.syncFromNative(menuEl);
    startCatchupSync();
    clearPendingClass();
    return true;
  }

  document.documentElement.classList.add(PENDING_CLASS);

  const menu = (await waitForElm("#menu", true, 50, 200)) as HTMLElement | null;
  if (!menu) return false;

  // Prefer a populated native list, but don't block forever during loading.
  let list = getNativeMenuList(menu);
  if (!list) {
    await waitForElm("#menu > ul:not(#bsplus-sidebar-root)", true, 50, 120);
    list = getNativeMenuList(menu);
  }
  if (!list) return false;

  if (app) {
    menuEl = menu;
    ensureDefaultMenuOrder(menu);
    sidebarState.syncFromNative(menu);
    clearPendingClass();
    return true;
  }

  menuEl = menu;
  menu.classList.add(MENU_CLASS);

  // Remove a stale root from a previous HMR / partial mount.
  document.getElementById(ROOT_ID)?.remove();

  ensureDefaultMenuOrder(menu);
  sidebarState.syncSettings();
  sidebarState.syncFromNative(menu);

  // Mount as a direct child of `#menu` so root is `#menu > ul#bsplus-sidebar-root`.
  app = mount(Sidebar, {
    target: menu,
    props: { menuEl: menu },
  });

  menu
    .querySelectorAll(".bsplus-sidebar-offscreen")
    .forEach((node) => node.classList.remove("bsplus-sidebar-offscreen"));

  menuObserver?.disconnect();
  menuObserver = new MutationObserver((mutations) => {
    const ours = document.getElementById(ROOT_ID);
    if (ours && mutations.every((m) => ours.contains(m.target))) return;
    scheduleSync();
  });
  menuObserver.observe(menu, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-key", "data-path", "data-colour"],
  });

  if (!hashListenerAttached) {
    window.addEventListener("hashchange", onHashChange);
    hashListenerAttached = true;
  }

  if (!nativeMenuListenerAttached) {
    window.addEventListener("bsplus-native-menu-updated", onNativeMenuUpdated);
    nativeMenuListenerAttached = true;
  }

  clearSettingListeners();
  registerSetting("iconOnlySidebar", () => {
    sidebarState.syncSettings();
  });
  registerSetting("menuorder", () => {
    if (menuEl) sidebarState.syncFromNative(menuEl);
  });
  registerSetting("menuitems", () => {
    if (menuEl) sidebarState.syncFromNative(menuEl);
  });

  startCatchupSync();
  clearPendingClass();
  return true;
}

export function unmountCustomSidebar() {
  menuObserver?.disconnect();
  menuObserver = null;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
  if (catchupTimer) clearInterval(catchupTimer);
  catchupTimer = null;

  clearSettingListeners();

  if (hashListenerAttached) {
    window.removeEventListener("hashchange", onHashChange);
    hashListenerAttached = false;
  }

  if (nativeMenuListenerAttached) {
    window.removeEventListener(
      "bsplus-native-menu-updated",
      onNativeMenuUpdated,
    );
    nativeMenuListenerAttached = false;
  }

  if (app) {
    unmount(app);
    app = null;
  }

  document.getElementById(ROOT_ID)?.remove();
  menuEl?.classList.remove(MENU_CLASS, "bsplus-sidebar-edit-mode");
  menuEl = null;
  sidebarState.resetDrill();
  sidebarState.setEditMode(false);
  sidebarState.ready = false;
  earlyPrepareStarted = false;
  clearPendingClass();
}
