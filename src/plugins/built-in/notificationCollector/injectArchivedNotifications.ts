import type { PluginAPI } from "../../core/types";
import ReactFiber from "@/seqta/utils/ReactFiber";
import { delay } from "@/seqta/utils/delay";
import {
  archivedToApiNotification,
  listArchivedNotifications,
  type ArchiveMap,
  type ArchivesByUser,
} from "./archive";

const LIST_SELECTOR = '[class*="notifications__list___"]';
const ITEMS_SELECTOR = '[class*="notifications__items___"]';
const ITEM_SELECTOR = '[class*="notifications__item___"]';
const BACKED_UP_CLASS = "bsplus-notification-backed-up";
const BACKUP_BADGE_CLASS = "bsplus-notification-backup-badge";

const BACKUP_CHECK_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

function notificationTimestamp(item: Record<string, unknown>): number {
  const ms = new Date(String(item.timestamp ?? 0)).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function mergeLiveWithArchived(
  liveItems: Record<string, unknown>[],
  archive: ArchiveMap,
): Record<string, unknown>[] | null {
  const liveIds = new Set(liveItems.map((item) => Number(item.notificationID)));
  const missing = listArchivedNotifications(archive)
    .filter((item) => !liveIds.has(item.notificationID))
    .map((item) => archivedToApiNotification(item));

  if (missing.length === 0) return null;

  return [...liveItems, ...missing].sort(
    (a, b) => notificationTimestamp(b) - notificationTimestamp(a),
  );
}

function sameItemOrder(
  current: Record<string, unknown>[],
  merged: Record<string, unknown>[],
): boolean {
  if (current.length !== merged.length) return false;
  return current.every(
    (item, index) =>
      Number(item.notificationID) === Number(merged[index]?.notificationID),
  );
}

async function tryInjectArchived(archive: ArchiveMap): Promise<boolean> {
  if (!document.querySelector(LIST_SELECTOR)) return false;

  const state = await ReactFiber.find(LIST_SELECTOR).getState();
  if (!state || !Array.isArray(state.items)) return false;

  const liveItems = state.items as Record<string, unknown>[];
  const merged = mergeLiveWithArchived(liveItems, archive);
  if (!merged) return true;
  if (sameItemOrder(liveItems, merged)) return true;

  await ReactFiber.find(LIST_SELECTOR).setState({ items: merged });
  return true;
}

async function injectWithRetries(archive: ArchiveMap, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const done = await tryInjectArchived(archive);
    if (done) break;
    await delay(120);
  }
  applyBackupBadges(archive);
}

export function applyBackupBadges(archive: ArchiveMap) {
  const backedUpIds = new Set(Object.keys(archive));

  for (const itemEl of document.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
    const id = itemEl.getAttribute("data-id");
    if (!id) continue;

    if (backedUpIds.has(id)) {
      itemEl.classList.add(BACKED_UP_CLASS);
      if (!itemEl.querySelector(`.${BACKUP_BADGE_CLASS}`)) {
        const badge = document.createElement("span");
        badge.className = BACKUP_BADGE_CLASS;
        badge.title = "Saved locally";
        badge.innerHTML = BACKUP_CHECK_SVG;
        itemEl.appendChild(badge);
      }
    } else {
      itemEl.classList.remove(BACKED_UP_CLASS);
      itemEl.querySelector(`.${BACKUP_BADGE_CLASS}`)?.remove();
    }
  }
}

export function mountArchivedNotificationInjection(
  api: PluginAPI<Record<string, never>, { archivesByUser?: ArchivesByUser }>,
  getUserKey: () => Promise<string | null>,
) {
  let observer: MutationObserver | null = null;
  let injectScheduled = false;

  const scheduleInject = () => {
    if (injectScheduled) return;
    injectScheduled = true;
    window.setTimeout(async () => {
      injectScheduled = false;
      const userKey = await getUserKey();
      if (!userKey) return;
      const archive = api.storage.archivesByUser?.[userKey] ?? {};
      if (Object.keys(archive).length === 0) return;
      await injectWithRetries(archive);
    }, 60);
  };

  const watchItemsContainer = () => {
    const itemsEl = document.querySelector(ITEMS_SELECTOR);
    if (!itemsEl) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => scheduleInject());
    observer.observe(itemsEl, { childList: true });
  };

  api.seqta.onMount(LIST_SELECTOR, () => {
    scheduleInject();
    watchItemsContainer();
  });

  api.seqta.onMount(ITEMS_SELECTOR, () => {
    watchItemsContainer();
    scheduleInject();
  });

  api.storage.onChange("archivesByUser", () => scheduleInject());

  return () => {
    if (observer) observer.disconnect();
  };
}

export async function injectArchivedForUser(
  archive: ArchiveMap,
): Promise<void> {
  await injectWithRetries(archive);
}
