import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { waitForElm } from "@/seqta/utils/waitForElm";

function findNotificationPanel(): HTMLElement | null {
  const wrapper = document.querySelector(".connectedNotificationsWrapper");
  if (!wrapper) return null;

  const flat = wrapper.querySelector<HTMLElement>(":scope > div > button + div");
  if (flat) return flat;

  const notifBlock = wrapper.querySelector("[class*='notifications__notifications___']");
  if (notifBlock?.nextElementSibling instanceof HTMLElement) {
    return notifBlock.nextElementSibling;
  }

  const list = wrapper.querySelector<HTMLElement>("[class*='notifications__list___']");
  if (list) return list;

  return null;
}

function isPanelVisible(el: HTMLElement): boolean {
  if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
  return el.offsetWidth > 0 || el.offsetHeight > 0;
}

let lastVisible = false;
let observerStarted = false;
let trackedPanel: HTMLElement | null = null;
/** Ignore observer callbacks while we toggle animation classes. */
let suppressSync = false;

function setPanelOpen(panel: HTMLElement, open: boolean) {
  panel.classList.add("bsplus-notifications-panel");
  panel.style.removeProperty("opacity");
  panel.style.removeProperty("transform");

  if (!settingsState.animations) {
    panel.classList.toggle("bsplus-notifications-panel--open", open);
    return;
  }

  const isOpen = panel.classList.contains("bsplus-notifications-panel--open");
  if (open === isOpen) return;

  suppressSync = true;

  if (open) {
    panel.classList.remove("bsplus-notifications-panel--open");
    void panel.offsetWidth;
    panel.classList.add("bsplus-notifications-panel--open");
  } else {
    panel.classList.remove("bsplus-notifications-panel--open");
  }

  const release = () => {
    suppressSync = false;
  };
  panel.addEventListener("transitionend", release, { once: true });
  window.setTimeout(release, 280);
}

function syncPanelState() {
  if (suppressSync) return;

  const panel = findNotificationPanel();

  if (!panel) {
    if (lastVisible && trackedPanel?.isConnected) {
      setPanelOpen(trackedPanel, false);
    }
    lastVisible = false;
    trackedPanel = null;
    return;
  }

  if (trackedPanel && trackedPanel !== panel) {
    setPanelOpen(trackedPanel, false);
  }
  trackedPanel = panel;

  const visible = isPanelVisible(panel);
  if (visible === lastVisible) return;

  setPanelOpen(panel, visible);
  lastVisible = visible;
}

/**
 * CSS open/close for the native SEQTA notifications dropdown.
 */
export function attachNotificationsPanelAnimation() {
  void setupNotificationsPanelAnimation();
}

async function setupNotificationsPanelAnimation() {
  if (observerStarted) return;

  try {
    await waitForElm(".connectedNotificationsWrapper", true, 100, 60);
  } catch {
    return;
  }

  const wrapper = document.querySelector(".connectedNotificationsWrapper");
  if (!wrapper) return;

  observerStarted = true;

  let syncFrame = 0;
  const scheduleSync = () => {
    cancelAnimationFrame(syncFrame);
    syncFrame = requestAnimationFrame(() => {
      syncFrame = 0;
      syncPanelState();
    });
  };

  const observer = new MutationObserver((mutations) => {
    if (
      suppressSync ||
      !mutations.some(
        (m) =>
          m.type === "childList" ||
          (m.type === "attributes" &&
            (m.attributeName === "hidden" || m.attributeName === "aria-hidden")),
      )
    ) {
      return;
    }
    scheduleSync();
  });
  observer.observe(wrapper, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden", "aria-hidden"],
  });

  wrapper.addEventListener(
    "click",
    () => {
      requestAnimationFrame(() => requestAnimationFrame(scheduleSync));
    },
    true,
  );

  scheduleSync();
}
