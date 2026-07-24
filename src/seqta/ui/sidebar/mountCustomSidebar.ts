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
let sidebarCaptureAttached = false;
let earlyPrepareStarted = false;
let catchupTimer: ReturnType<typeof setInterval> | null = null;
let nativeMenuListenerAttached = false;

const settingsListeners: Array<{
  key: keyof SettingsState;
  listener: ChangeListener;
}> = [];

function syncFromMenu() {
  if (menuEl) sidebarState.syncFromNative(menuEl);
}

function startCatchupSync() {
  if (catchupTimer) clearInterval(catchupTimer);
  let attempts = 0;
  catchupTimer = setInterval(() => {
    attempts += 1;
    syncFromMenu();
    // Plugins (Analytics, Overview, icons) inject shortly after first paint.
    if (attempts >= 60) {
      clearInterval(catchupTimer!);
      catchupTimer = null;
    }
  }, 50);
}

function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncFromMenu();
  }, 50);
}

/**
 * Capture-phase: own all clicks inside the custom list so SEQTA's #menu handlers
 * never see them. Opening Goals/Folios via SEQTA + our drill UI freezes the tab.
 */
function onCustomSidebarCaptureClick(event: MouseEvent) {
  if (!menuEl || sidebarState.editMode) return;

  const root = document.getElementById(ROOT_ID);
  const target = event.target;
  if (!(target instanceof Element) || !root?.contains(target)) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const back = target.closest(".back");
  if (back instanceof HTMLElement && root.contains(back)) {
    sidebarState.goBack();
    return;
  }

  const li = target.closest("li.item[data-key]");
  if (!(li instanceof HTMLElement) || !root.contains(li)) return;

  // Already-open folder chrome (renders its own `.sub`) — ignore; use Back.
  if (
    li.classList.contains("hasChildren") &&
    li.querySelector(":scope > .sub")
  ) {
    return;
  }

  const key = li.dataset.key;
  if (!key) return;
  const item = sidebarState.findByKey(key);
  if (item) sidebarState.activateItem(item, menuEl);
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

  const current = settingsState.defaultmenuorder ?? [];
  if (!current.length) {
    settingsState.defaultmenuorder = keys;
    return;
  }

  const missing = keys.filter((key) => !current.includes(key));
  if (missing.length) {
    settingsState.defaultmenuorder = [...current, ...missing];
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

export async function mountCustomSidebar(): Promise<boolean> {
  if (isSeqtaEngageExperience()) return false;
  if (!settingsState.onoff) return false;

  // Already mounted — re-sync after Home/News/Analytics injections.
  if (app && menuEl) {
    ensureDefaultMenuOrder(menuEl);
    sidebarState.syncSettings();
    syncFromMenu();
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

  menuEl = menu;
  ensureDefaultMenuOrder(menu);
  sidebarState.syncSettings();
  syncFromMenu();

  if (app) {
    clearPendingClass();
    return true;
  }

  menu.classList.add(MENU_CLASS);
  document.getElementById(ROOT_ID)?.remove();

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
    // Ignore our list entirely. Ignore native class/style churn — SEQTA and
    // theme transitions rewrite those constantly; syncing on them freezes the tab.
    const relevant = mutations.some((m) => {
      if (ours?.contains(m.target as Node)) return false;
      if (m.type === "attributes") {
        const attr = m.attributeName;
        if (attr === "class" || attr === "style") return false;
      }
      return true;
    });
    if (!relevant) return;
    scheduleSync();
  });
  menuObserver.observe(menu, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-key", "data-path", "data-colour"],
  });

  if (!sidebarCaptureAttached) {
    document.addEventListener("click", onCustomSidebarCaptureClick, true);
    sidebarCaptureAttached = true;
  }

  if (!hashListenerAttached) {
    window.addEventListener("hashchange", onHashChange);
    hashListenerAttached = true;
  }

  if (!nativeMenuListenerAttached) {
    window.addEventListener("bsplus-native-menu-updated", syncFromMenu);
    nativeMenuListenerAttached = true;
  }

  clearSettingListeners();
  registerSetting("iconOnlySidebar", () => sidebarState.syncSettings());
  const resync = () => syncFromMenu();
  registerSetting("menuorder", resync);
  registerSetting("menuitems", resync);

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

  if (sidebarCaptureAttached) {
    document.removeEventListener("click", onCustomSidebarCaptureClick, true);
    sidebarCaptureAttached = false;
  }

  if (nativeMenuListenerAttached) {
    window.removeEventListener("bsplus-native-menu-updated", syncFromMenu);
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
  earlyPrepareStarted = false;
  clearPendingClass();
}
