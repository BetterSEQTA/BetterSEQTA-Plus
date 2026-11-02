import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { refreshCloudUserFromServer } from "@/seqta/utils/cloudPfpSync";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { fullMotionEffectsEnabled } from "@/seqta/utils/performanceMode";
import {
  badgeBlobStyle,
  badgesForTitlebar,
  badgeVisualForKey,
  type BadgeItem,
} from "@/seqta/utils/founderBadges";
import { openFounderBadgeModal } from "@/seqta/ui/founderBadge/openFounderBadgeModal";
import { remoteChromeGateAllowed } from "@/seqta/utils/remoteConfig/routeGate";

let subscribed = false;
let refreshPending = false;
let profileSyncedThisSession = false;

const BADGE_CYCLE_MS = 4500;
const carouselTimers = new WeakMap<HTMLElement, ReturnType<typeof setInterval>>();

function stopBadgeCarousel(slot: HTMLElement): void {
  clearInterval(carouselTimers.get(slot));
  carouselTimers.delete(slot);
}

function createBadgeButton(badge: BadgeItem, signupNumber?: number | null): HTMLButtonElement | null {
  const visual = badgeVisualForKey(badge.key, badge.label);
  if (!visual) return null;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bsplus-titlebar-badge";
  button.style.cssText = badgeBlobStyle(visual);
  button.textContent = badge.label || visual.label;
  button.addEventListener("click", () => openFounderBadgeModal(badge, signupNumber));
  return button;
}

function showBadge(buttons: HTMLButtonElement[], index: number): void {
  buttons.forEach((button, i) => {
    const active = i === index;
    button.toggleAttribute("inert", !active);
    button.setAttribute("aria-hidden", String(!active));
  });
}

function renderTitlebarBadges(
  slot: HTMLElement,
  badges: BadgeItem[],
  signupNumber?: number | null,
): void {
  stopBadgeCarousel(slot);

  const buttons = badges.flatMap((badge) => createBadgeButton(badge, signupNumber) ?? []);

  slot.replaceChildren(...buttons);
  slot.hidden = buttons.length === 0;
  slot.classList.toggle("bsplus-founder-badge-slot--static", !fullMotionEffectsEnabled());
  if (buttons.length <= 1) return;

  let index = 0;
  showBadge(buttons, index);
  carouselTimers.set(
    slot,
    setInterval(() => {
      index = (index + 1) % buttons.length;
      showBadge(buttons, index);
    }, BADGE_CYCLE_MS),
  );
}

async function syncTitlebarFounderBadge(): Promise<void> {
  const slots = document.querySelectorAll<HTMLElement>(".titlebar .bsplus-founder-badge-slot");
  for (const slot of slots) {
    stopBadgeCarousel(slot);
    slot.replaceChildren();
    slot.hidden = true;
  }

  if (
    settingsState.showTitlebarFounderBadge === false ||
    !cloudAuth.state.isLoggedIn ||
    !remoteChromeGateAllowed("ui.titlebar.founderBadge")
  ) {
    return;
  }

  let user = cloudAuth.state.user;
  const needsProfileSync =
    !profileSyncedThisSession || (user?.signup_number == null && !user?.badges?.length);
  if (needsProfileSync && !refreshPending) {
    refreshPending = true;
    try {
      await refreshCloudUserFromServer();
      user = cloudAuth.state.user;
      profileSyncedThisSession = true;
    } finally {
      refreshPending = false;
    }
  }

  const badges = badgesForTitlebar(user?.badges ?? [], user?.signup_number);
  if (badges.length === 0) return;

  for (const slot of slots) {
    renderTitlebarBadges(slot, badges, user?.signup_number);
  }
}

export function refreshTitlebarFounderBadge(): void {
  void syncTitlebarFounderBadge();
}

export function ensureTitlebarFounderBadgeMounted(): void {
  if (!subscribed) {
    subscribed = true;
    cloudAuth.subscribe((state) => {
      if (!state.isLoggedIn) profileSyncedThisSession = false;
      void syncTitlebarFounderBadge();
    });
    settingsState.register("showTitlebarFounderBadge", () => void syncTitlebarFounderBadge());
  }
  void syncTitlebarFounderBadge();
}
