import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { refreshCloudUserFromServer } from "@/seqta/utils/cloudPfpSync";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  badgesForTitlebar,
  founderBadgeChipHtml,
  type BadgeItem,
} from "@/seqta/utils/founderBadges";
import { openFounderBadgeModal } from "@/seqta/ui/founderBadge/openFounderBadgeModal";

let subscribed = false;
let refreshPending = false;
let profileSyncedThisSession = false;

function renderTitlebarBadges(
  slot: HTMLElement,
  badges: BadgeItem[],
  signupNumber?: number | null,
): void {
  const house = slot
    .closest(".userInfoHouseWrap")
    ?.querySelector<HTMLElement>(".userInfohouse");
  if (house?.style.display === "none") {
    slot.replaceChildren();
    slot.hidden = true;
    return;
  }

  const chips = badges
    .map((b) => founderBadgeChipHtml(b, { titlebar: true }))
    .filter(Boolean)
    .join("");
  if (!chips) {
    slot.replaceChildren();
    slot.hidden = true;
    return;
  }

  slot.hidden = false;
  slot.innerHTML = `<div class="bsplus-founder-badge-stack">${chips}</div>`;

  slot.querySelectorAll<HTMLButtonElement>(".bsplus-founder-badge").forEach((chip) => {
    const badge = badges.find((b) => b.key === chip.dataset.tier);
    if (!badge) return;
    chip.setAttribute("aria-label", `${badge.label}, click for details`);
    chip.addEventListener("click", () => openFounderBadgeModal(badge, signupNumber));
  });
}

async function syncTitlebarFounderBadge(): Promise<void> {
  const slots = document.querySelectorAll<HTMLElement>(".titlebar .bsplus-founder-badge-slot");
  for (const slot of slots) {
    slot.replaceChildren();
    slot.hidden = true;
  }

  if (settingsState.showTitlebarFounderBadge === false || !cloudAuth.state.isLoggedIn) return;

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
