import { animate } from "motion";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

export const HOST_OPEN_CLASS = "bsplus-settings-host--open";
const HOST_CLOSING_CLASS = "bsplus-settings-host--closing";
const PANEL_OPEN_CLASS = "bsplus-settings-panel--open";

/** True when the settings host is shown (not fully hidden). */
export function isSettingsHostVisiblyOpen(host: HTMLElement | null | undefined): boolean {
  if (!host) return false;
  if (host.classList.contains("hide")) return false;
  return host.classList.contains(HOST_OPEN_CLASS);
}

export function isExtensionSettingsOpen(): boolean {
  return isSettingsHostVisiblyOpen(document.getElementById("ExtensionPopup"));
}

function settingsPanel(host: HTMLElement): HTMLElement | null {
  return host.shadowRoot?.querySelector<HTMLElement>("[data-settings-panel]") ?? null;
}

const popupAnimations = new WeakMap<HTMLElement, {
  progress: number;
  animation?: ReturnType<typeof animate>;
}>();

function animatePopup(host: HTMLElement, opening: boolean): void {
  const previous = popupAnimations.get(host);
  previous?.animation?.stop();
  const state = { progress: previous?.progress ?? 0, animation: undefined as ReturnType<typeof animate> | undefined };
  popupAnimations.set(host, state);
  if (opening) host.dispatchEvent(new Event("bsplus:settings-opening", { bubbles: true }));
  const panel = settingsPanel(host);
  const backdrop = host.shadowRoot?.querySelector<HTMLElement>(".settings-backdrop");
  host.style.transform = "none";
  host.style.transition = "none";
  host.style.opacity = "1";
  host.classList.toggle("hide", !opening);
  host.classList.toggle(HOST_OPEN_CLASS, opening);
  host.classList.toggle(HOST_CLOSING_CLASS, !opening);
  panel?.classList.toggle(PANEL_OPEN_CLASS, opening);

  const update = (progress: number) => {
    state.progress = progress;
    const opacity = String(Math.max(0, Math.min(1, progress)));
    if (backdrop) backdrop.style.opacity = opacity;
    if (panel) {
      panel.style.transition = "none";
      panel.style.opacity = opacity;
      panel.style.transform = `scale(${Math.max(0, progress)})`;
    }
  };
  const complete = () => {
    if (popupAnimations.get(host) !== state) return;
    update(opening ? 1 : 0);
    if (!opening) {
      host.classList.remove(HOST_CLOSING_CLASS);
      host.style.opacity = "0";
      host.dispatchEvent(new Event("bsplus:settings-hidden", { bubbles: true }));
    }
    state.animation = undefined;
  };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!panel || !settingsState.animations || settingsState.performanceMode || reducedMotion) {
    complete();
    return;
  }
  update(state.progress);
  state.animation = animate(state.progress, opening ? 1 : 0, {
    type: "spring",
    stiffness: opening ? 280 : 520,
    damping: 20,
    onUpdate: update,
    onComplete: complete,
  });
}

export function animateSettingsOpen(host: HTMLElement): void {
  animatePopup(host, true);
}

export function animateSettingsClose(host: HTMLElement): void {
  animatePopup(host, false);
}

let prefetchStarted = false;

/** Warm settings chunks during idle time so the first open feels instant. */
export function prefetchSettingsShell(): void {
  if (prefetchStarted) return;
  prefetchStarted = true;
  const run = () => {
    void import("@/interface/main");
    void import("@/interface/pages/settings/SettingsBody.svelte");
    void import("@/interface/pages/settings/sections/generalOptions.svelte");
  };
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 8000 });
  } else {
    window.setTimeout(run, 3000);
  }
}
