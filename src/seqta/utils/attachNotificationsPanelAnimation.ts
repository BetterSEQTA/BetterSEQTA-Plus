import { animate } from "motion";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { waitForElm } from "@/seqta/utils/waitForElm";

/**
 * Finds the SEQTA notifications dropdown panel (the list container next to the bell).
 */
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
  return (
    el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden"
  );
}

let lastVisible = false;
/** Invalidates in-flight open animations when the panel closes or reopens. */
let motionGeneration = 0;

function runOpenAnimation(panel: HTMLElement) {
  const myGen = ++motionGeneration;
  panel.classList.add("bsplus-notifications-panel");

  if (!settingsState.animations) {
    panel.style.opacity = "1";
    panel.style.transform = "scale(1)";
    return;
  }

  panel.style.opacity = "0";
  panel.style.transform = "scale(0)";

  requestAnimationFrame(() => {
    if (myGen !== motionGeneration) return;
    animate(0, 1, {
      onUpdate: (progress) => {
        panel.style.opacity = String(progress);
        panel.style.transform = `scale(${progress})`;
      },
      type: "spring",
      stiffness: 280,
      damping: 20,
    });
  });
}

function clearPanelMotionStyles(panel: HTMLElement) {
  motionGeneration++;
  panel.style.opacity = "";
  panel.style.transform = "";
}

/**
 * Spring open / fade close for the native SEQTA notifications dropdown, matching ExtensionPopup.
 */
export function attachNotificationsPanelAnimation() {
  void setupNotificationsPanelAnimation();
}

async function setupNotificationsPanelAnimation() {
  try {
    await waitForElm(".connectedNotificationsWrapper", true, 100, 60);
  } catch {
    return;
  }

  const wrapper = document.querySelector(".connectedNotificationsWrapper");
  if (!wrapper) return;

  const sync = () => {
    const panel = findNotificationPanel();
    // When SEQTA removes the dropdown from the DOM on close, we must reset
    // lastVisible — otherwise the next open still looks "already visible" and skips animation.
    if (!panel) {
      if (lastVisible) {
        lastVisible = false;
        motionGeneration++;
      }
      return;
    }

    const visible = isPanelVisible(panel);
    if (visible === lastVisible) return;

    if (visible) {
      runOpenAnimation(panel);
    } else {
      clearPanelMotionStyles(panel);
    }
    lastVisible = visible;
  };

  const observer = new MutationObserver(() => {
    sync();
  });
  observer.observe(wrapper, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  document.addEventListener(
    "click",
    () => {
      requestAnimationFrame(() => requestAnimationFrame(sync));
    },
    true,
  );

  sync();
}
