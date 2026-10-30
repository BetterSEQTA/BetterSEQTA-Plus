import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { refreshCloudUserFromServer } from "@/seqta/utils/cloudPfpSync";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { fullMotionEffectsEnabled } from "@/seqta/utils/performanceMode";
import {
  badgesForTitlebar,
  founderBadgeChipHtml,
  type BadgeItem,
} from "@/seqta/utils/founderBadges";
import { openFounderBadgeModal } from "@/seqta/ui/founderBadge/openFounderBadgeModal";

let subscribed = false;
let refreshPending = false;
let profileSyncedThisSession = false;

const BADGE_CYCLE_MS = 4500;
const carouselTimers = new WeakMap<HTMLElement, ReturnType<typeof setInterval>>();

function stopBadgeCarousel(slot: HTMLElement): void {
  const timer = carouselTimers.get(slot);
  if (timer != null) {
    clearInterval(timer);
    carouselTimers.delete(slot);
  }
}

function wireBadgeChip(
  chip: HTMLButtonElement,
  badge: BadgeItem,
  signupNumber?: number | null,
): void {
  chip.setAttribute("aria-label", `${badge.label}, click for details`);
  chip.addEventListener("click", () => openFounderBadgeModal(badge, signupNumber));
}

function setActiveBadgeChip(chips: HTMLButtonElement[], index: number): void {
  chips.forEach((chip, i) => {
    const active = i === index;
    chip.classList.toggle("bsplus-founder-badge--active", active);
    chip.setAttribute("aria-hidden", active ? "false" : "true");
    chip.tabIndex = active ? 0 : -1;
  });
}

/** Carousel chips share the widest label width so the pill does not shrink while cycling. */
function syncCarouselTrackWidth(
  carousel: HTMLElement,
  chips: HTMLButtonElement[],
): void {
  carousel.style.removeProperty("width");
  for (const chip of chips) chip.style.width = "max-content";

  let maxWidth = 0;
  for (const chip of chips) {
    maxWidth = Math.max(maxWidth, chip.getBoundingClientRect().width);
  }
  if (maxWidth <= 0) return;

  const px = `${Math.ceil(maxWidth)}px`;
  carousel.style.width = px;
  for (const chip of chips) chip.style.width = "100%";
}

function startBadgeCarousel(
  slot: HTMLElement,
  chips: HTMLButtonElement[],
  badges: BadgeItem[],
  signupNumber?: number | null,
): void {
  stopBadgeCarousel(slot);
  if (chips.length <= 1) return;

  let index = 0;
  setActiveBadgeChip(chips, index);
  slot.setAttribute(
    "aria-label",
    `${badges[index]?.label ?? "Cloud badge"}. Cycles through ${badges.length} badges.`,
  );

  carouselTimers.set(
    slot,
    setInterval(() => {
      index = (index + 1) % chips.length;
      setActiveBadgeChip(chips, index);
      const label = badges[index]?.label;
      if (label) slot.setAttribute("aria-label", `${label}. Badge ${index + 1} of ${badges.length}.`);
    }, BADGE_CYCLE_MS),
  );
}

function renderTitlebarBadges(
  slot: HTMLElement,
  badges: BadgeItem[],
  signupNumber?: number | null,
): void {
  stopBadgeCarousel(slot);

  const house = slot
    .closest(".userInfoHouseWrap")
    ?.querySelector<HTMLElement>(".userInfohouse");
  if (house?.style.display === "none") {
    slot.replaceChildren();
    slot.hidden = true;
    return;
  }

  const rendered = badges
    .map((b) => ({ badge: b, html: founderBadgeChipHtml(b, { titlebar: true }) }))
    .filter((entry) => entry.html.length > 0);

  if (rendered.length === 0) {
    slot.replaceChildren();
    slot.hidden = true;
    return;
  }

  slot.hidden = false;
  slot.removeAttribute("aria-label");

  if (rendered.length === 1) {
    slot.innerHTML = rendered[0].html;
    const chip = slot.querySelector<HTMLButtonElement>(".bsplus-founder-badge");
    if (chip) wireBadgeChip(chip, rendered[0].badge, signupNumber);
    return;
  }

  const motionClass = fullMotionEffectsEnabled()
    ? "bsplus-founder-badge-carousel"
    : "bsplus-founder-badge-carousel bsplus-founder-badge-carousel--static";
  slot.innerHTML = `<div class="${motionClass}">${rendered.map((r) => r.html).join("")}</div>`;

  const chips = [...slot.querySelectorAll<HTMLButtonElement>(".bsplus-founder-badge")];
  chips.forEach((chip, i) => {
    const entry = rendered[i];
    if (!entry) return;
    wireBadgeChip(chip, entry.badge, signupNumber);
  });

  const carousel = slot.querySelector<HTMLElement>(".bsplus-founder-badge-carousel");
  if (carousel) syncCarouselTrackWidth(carousel, chips);

  startBadgeCarousel(
    slot,
    chips,
    rendered.map((r) => r.badge),
    signupNumber,
  );
}

async function syncTitlebarFounderBadge(): Promise<void> {
  const slots = document.querySelectorAll<HTMLElement>(".titlebar .bsplus-founder-badge-slot");
  for (const slot of slots) {
    stopBadgeCarousel(slot);
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
