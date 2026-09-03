import { settingsState } from "@/seqta/utils/listeners/SettingsState";

const HOST_OPEN_CLASS = "bsplus-settings-host--open";
const HOST_CLOSING_CLASS = "bsplus-settings-host--closing";
const PANEL_OPEN_CLASS = "bsplus-settings-panel--open";

function settingsPanel(host: HTMLElement): HTMLElement | null {
  return host.shadowRoot?.querySelector<HTMLElement>("[data-settings-panel]") ?? null;
}

export function animateSettingsOpen(host: HTMLElement): void {
  host.style.transform = "none";
  host.classList.remove(HOST_CLOSING_CLASS, "hide");

  const panel = settingsPanel(host);
  if (!settingsState.animations) {
    host.style.opacity = "1";
    host.classList.add(HOST_OPEN_CLASS);
    panel?.classList.add(PANEL_OPEN_CLASS);
    return;
  }

  host.style.opacity = "";
  host.classList.remove(HOST_OPEN_CLASS);
  panel?.classList.remove(PANEL_OPEN_CLASS);

  requestAnimationFrame(() => {
    host.classList.add(HOST_OPEN_CLASS);
    panel?.classList.add(PANEL_OPEN_CLASS);
  });
}

export function animateSettingsClose(host: HTMLElement): void {
  host.classList.add("hide");
  const panel = settingsPanel(host);

  if (!settingsState.animations) {
    host.classList.remove(HOST_OPEN_CLASS, HOST_CLOSING_CLASS);
    panel?.classList.remove(PANEL_OPEN_CLASS);
    host.style.opacity = "0";
    return;
  }

  host.classList.remove(HOST_OPEN_CLASS);
  host.classList.add(HOST_CLOSING_CLASS);
  panel?.classList.remove(PANEL_OPEN_CLASS);

  const durationMs = document.documentElement.classList.contains("performanceMode")
    ? 160
    : 200;

  window.setTimeout(() => {
    host.classList.remove(HOST_CLOSING_CLASS);
    host.style.opacity = "0";
  }, durationMs);
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
