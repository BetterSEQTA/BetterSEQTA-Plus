import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { refreshCloudUserFromServer } from "@/seqta/utils/cloudPfpSync";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  founderBadgeChipHtml,
  pickPrimaryFounderBadge,
  type FounderBadgeItem,
} from "@/seqta/utils/founderBadges";
import { openFounderBadgeModal } from "@/seqta/ui/founderBadge/openFounderBadgeModal";

let subscribed = false;
let refreshPending = false;

function renderBadgeChip(
  slot: HTMLElement,
  badge: FounderBadgeItem,
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

  slot.hidden = false;
  slot.innerHTML = founderBadgeChipHtml(badge, { titlebar: true });

  const chip = slot.querySelector<HTMLButtonElement>(".bsplus-founder-badge");
  if (!chip) return;

  chip.setAttribute("aria-label", `${badge.label}, click for details`);
  chip.addEventListener("click", () => openFounderBadgeModal(badge, signupNumber));
}

async function syncTitlebarFounderBadge(): Promise<void> {
  const slots = document.querySelectorAll<HTMLElement>(".titlebar .bsplus-founder-badge-slot");
  for (const slot of slots) {
    slot.replaceChildren();
    slot.hidden = true;
  }

  if (settingsState.showTitlebarFounderBadge === false || !cloudAuth.state.isLoggedIn) return;

  let user = cloudAuth.state.user;
  if (user && user.signup_number == null && !user.badges?.length) {
    if (!refreshPending) {
      refreshPending = true;
      try {
        await refreshCloudUserFromServer();
        user = cloudAuth.state.user;
      } finally {
        refreshPending = false;
      }
    }
  }

  const badge = pickPrimaryFounderBadge(user?.badges ?? [], user?.signup_number);
  if (!badge) return;

  for (const slot of slots) {
    renderBadgeChip(slot, badge, user?.signup_number);
  }
}

export function refreshTitlebarFounderBadge(): void {
  void syncTitlebarFounderBadge();
}

export function ensureTitlebarFounderBadgeMounted(): void {
  if (!subscribed) {
    subscribed = true;
    cloudAuth.subscribe(() => void syncTitlebarFounderBadge());
    settingsState.register("showTitlebarFounderBadge", () => void syncTitlebarFounderBadge());
  }
  void syncTitlebarFounderBadge();
}
