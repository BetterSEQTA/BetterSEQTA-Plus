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

async function tryInjectArchived(archive: ArchiveMap): Promise<boolean> {
  if (!document.querySelector(LIST_SELECTOR)) return false;

  const state = await ReactFiber.find(LIST_SELECTOR).getState();
  if (!state || !Array.isArray(state.items)) return false;

  const liveItems = state.items as Record<string, unknown>[];
  const merged = mergeLiveWithArchived(liveItems, archive);
  if (!merged) return true;

  const sameOrder =
    liveItems.length === merged.length &&
    liveItems.every(
      (item, index) =>
        Number(item.notificationID) === Number(merged[index]?.notificationID),
    );
  if (sameOrder) return true;

  await ReactFiber.find(LIST_SELECTOR).setState({ items: merged });
  return true;
}

async function injectWithRetries(archive: ArchiveMap) {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (await tryInjectArchived(archive)) break;
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
        badge.textContent = "✓";
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
    observer?.disconnect();
    observer = new MutationObserver(scheduleInject);
    observer.observe(itemsEl, { childList: true });
  };

  const onNotificationsMount = () => {
    scheduleInject();
    watchItemsContainer();
  };

  api.seqta.onMount(LIST_SELECTOR, onNotificationsMount);
  api.seqta.onMount(ITEMS_SELECTOR, onNotificationsMount);
  api.storage.onChange("archivesByUser", scheduleInject);

  return () => observer?.disconnect();
}

export async function injectArchivedForUser(archive: ArchiveMap): Promise<void> {
  await injectWithRetries(archive);
}
