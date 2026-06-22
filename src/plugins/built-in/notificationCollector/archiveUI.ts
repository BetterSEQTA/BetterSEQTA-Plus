import type { PluginAPI } from "../../core/types";
import type { ArchivedNotification, ArchiveMap } from "./archive";
import { listArchivedNotifications } from "./archive";
import { delay } from "@/seqta/utils/delay";
import ReactFiber from "@/seqta/utils/ReactFiber";
import { waitForElm } from "@/seqta/utils/waitForElm";

interface ArchiveUIStorage {
  archivesByUser?: Record<string, ArchiveMap>;
}

function formatArchiveDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function openArchivedMessage(item: ArchivedNotification) {
  if (!item.messageID) return;

  location.hash = `#?page=/messages`;

  await waitForElm('[class*="Viewer__Viewer___"] > div', true, 40);

  ReactFiber.find('[class*="Viewer__Viewer___"] > div').setState({
    selected: new Set([item.messageID]),
  });

  await delay(10);

  const row = document.querySelector('[class*="MessageList__selected___"]');
  if (row) (row as HTMLElement).click();
}

function openArchivedAssessment(item: ArchivedNotification) {
  if (!item.programmeID || !item.metaclassID) return;
  const base = `#?page=/assessments/${item.programmeID}:${item.metaclassID}`;
  location.hash = item.assessmentID ? `${base}&item=${item.assessmentID}` : base;
}

function renderArchiveItem(item: ArchivedNotification): HTMLElement {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "bsplus-notification-archive-item";
  row.dataset.notificationId = String(item.notificationID);

  const title = document.createElement("span");
  title.className = "bsplus-notification-archive-title";
  title.textContent = item.title;

  const meta = document.createElement("span");
  meta.className = "bsplus-notification-archive-meta";
  const parts = [formatArchiveDate(item.timestamp)];
  if (item.subtitle) parts.push(item.subtitle);
  if (item.subjectCode) parts.push(item.subjectCode);
  meta.textContent = parts.join(" · ");

  const badge = document.createElement("span");
  badge.className = "bsplus-notification-archive-badge";
  badge.textContent = "Saved locally";

  row.append(title, meta, badge);

  row.addEventListener("click", () => {
    if (item.type === "message") {
      void openArchivedMessage(item);
    } else if (item.type === "coneqtassessments") {
      openArchivedAssessment(item);
    }
  });

  return row;
}

export function mountArchiveUI(
  api: PluginAPI<Record<string, never>, ArchiveUIStorage>,
  getUserKey: () => Promise<string | null>,
) {
  const mountOnList = (listEl: HTMLElement) => {
    if (listEl.querySelector(".bsplus-notification-archive-bar")) return;

    const bar = document.createElement("div");
    bar.className = "bsplus-notification-archive-bar";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "bsplus-notification-archive-toggle";

    const panel = document.createElement("div");
    panel.className = "bsplus-notification-archive-panel";
    panel.hidden = true;

    const refresh = async () => {
      const userKey = await getUserKey();
      if (!userKey) {
        toggle.textContent = "Saved notifications (sign in required)";
        toggle.disabled = true;
        panel.replaceChildren();
        return;
      }

      const archivesByUser = api.storage.archivesByUser ?? {};
      const archive = archivesByUser[userKey] ?? {};
      const items = listArchivedNotifications(archive);
      const liveIds = new Set(
        Array.from(listEl.querySelectorAll('[class*="notifications__item___"]'))
          .map((el) => el.getAttribute("data-id"))
          .filter(Boolean),
      );
      const removedCount = items.filter(
        (item) => !liveIds.has(String(item.notificationID)),
      ).length;

      toggle.disabled = false;
      toggle.textContent =
        items.length === 0
          ? "Saved notifications (none yet)"
          : `Saved notifications (${items.length}${removedCount > 0 ? `, ${removedCount} no longer on SEQTA` : ""})`;

      panel.replaceChildren();
      if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "bsplus-notification-archive-empty";
        empty.textContent =
          "Notifications you receive are saved here per account in extension storage.";
        panel.append(empty);
        return;
      }

      for (const item of items) {
        panel.append(renderArchiveItem(item));
      }
    };

    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
      if (!panel.hidden) void refresh();
    });

    bar.append(toggle, panel);
    listEl.append(bar);
    void refresh();
  };

  api.seqta.onMount('[class*="notifications__list___"]', (el) => {
    mountOnList(el as HTMLElement);
  });

  api.storage.onChange("archivesByUser", () => {
    document
      .querySelectorAll('[class*="notifications__list___"]')
      .forEach((el) => {
        const bar = el.querySelector(".bsplus-notification-archive-bar");
        if (bar) bar.remove();
        mountOnList(el as HTMLElement);
      });
  });
}
