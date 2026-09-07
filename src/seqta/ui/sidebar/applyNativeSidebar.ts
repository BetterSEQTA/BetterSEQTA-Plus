import type { SettingsState } from "@/types/storage";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { isSeqtaEngageExperience, isSeqtaLoginPage } from "@/seqta/utils/isSeqtaEngage";
import { waitForElm } from "@/seqta/utils/waitForElm";
import {
  applySidebarLook,
  applySidebarStyleClass,
  clearSidebarAppearance,
} from "./sidebarStyles";

const MENU_CLASS = "bsplus-styled-sidebar";

type ChangeListener = (newValue: unknown, oldValue: unknown) => void;

let menuEl: HTMLElement | null = null;
let sidebarLookScheduled = false;
let settingsListenersAttached = false;

const settingsListeners: Array<{
  key: keyof SettingsState;
  listener: ChangeListener;
}> = [];

function scheduleSidebarLook() {
  if (!menuEl || sidebarLookScheduled) return;
  sidebarLookScheduled = true;
  requestAnimationFrame(() => {
    sidebarLookScheduled = false;
    if (menuEl) applySidebarLook(menuEl);
  });
}

function registerSetting(key: keyof SettingsState, listener: ChangeListener) {
  settingsState.register(key, listener);
  settingsListeners.push({ key, listener });
}

function clearSettingListeners() {
  for (const { key, listener } of settingsListeners) {
    settingsState.unregister(key, listener);
  }
  settingsListeners.length = 0;
  settingsListenersAttached = false;
}

function attachSettingsListeners() {
  if (settingsListenersAttached || !menuEl) return;
  settingsListenersAttached = true;
  clearSettingListeners();

  registerSetting("sidebarStyle", () =>
    applySidebarStyleClass(menuEl, settingsState.sidebarStyle),
  );
  for (const key of [
    "sidebarDensity",
    "sidebarCornerRadius",
    "sidebarActiveIndicator",
    "sidebarWidth",
    "sidebarBlur",
    "transparencyEffects",
  ] as const) {
    registerSetting(key, () => scheduleSidebarLook());
  }
}

function applyToMenu(menu: HTMLElement) {
  menuEl = menu;
  menu.classList.add(MENU_CLASS);
  applySidebarStyleClass(menu, settingsState.sidebarStyle);
  applySidebarLook(menu);
  attachSettingsListeners();
}

/** Apply sidebar width/blur CSS vars as soon as `#menu` exists (before full load). */
export function prepareNativeSidebarEarly() {
  if (isSeqtaEngageExperience() || isSeqtaLoginPage()) return;
  if (!settingsState.onoff) return;
  applySidebarLook(document.getElementById("menu"));
}

export async function applyNativeSidebar(): Promise<boolean> {
  if (isSeqtaEngageExperience() || isSeqtaLoginPage()) return false;
  if (!settingsState.onoff) return false;

  if (menuEl?.isConnected) {
    applyToMenu(menuEl);
    return true;
  }

  let menu: HTMLElement | null = null;
  try {
    menu = (await waitForElm("#menu", true, 50, 200)) as HTMLElement;
  } catch {
    return false;
  }
  if (!menu) return false;

  applyToMenu(menu);
  return true;
}

export function clearNativeSidebar() {
  clearSettingListeners();
  if (menuEl) {
    menuEl.classList.remove(MENU_CLASS);
    clearSidebarAppearance(menuEl);
  }
  menuEl = null;
}
