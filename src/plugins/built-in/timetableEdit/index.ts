import type { Plugin } from "../../core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";
import styles from "./styles.css?inline";

interface TimetableEntryData {
  ci: number;
  description: string;
  room: string;
  staff: string;
}

interface TimetableOverrides {
  [ci: string]: { room?: string; staff?: string };
}

interface TimetableOverridesBySubject {
  [description: string]: { room?: string; staff?: string };
}

interface TimetableStorage {
  timetableOverrides?: TimetableOverrides;
  timetableOverridesBySubject?: TimetableOverridesBySubject;
}

/** SEQTA timetable entries use .teacher and .room as direct children, and data-instance for ci */
function getRoomAndTeacherElements(entry: HTMLElement): {
  roomEl: HTMLElement | null;
  teacherEl: HTMLElement | null;
} {
  const roomEl = entry.querySelector(".room") as HTMLElement | null;
  const teacherEl = entry.querySelector(".teacher") as HTMLElement | null;
  return { roomEl, teacherEl };
}

const EDIT_ICON_SVG =
  '<svg width="24" height="24" viewBox="0 0 24 24"><g style="fill: currentcolor;"><path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></g></svg>';

function showEditModal(
  item: TimetableEntryData,
  overrides: TimetableOverrides | undefined,
  overridesBySubject: TimetableOverridesBySubject | undefined,
  onSave: (
    ci: number,
    room: string,
    staff: string,
    applyToFuture: boolean,
  ) => void,
  onClear: (ci: number) => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "timetable-edit-modal-overlay";

  const modal = document.createElement("div");
  modal.className = "timetable-edit-modal";

  const override =
    overrides?.[String(item.ci)] ?? overridesBySubject?.[item.description];

  const roomValue = override?.room ?? item.room ?? "";
  const staffValue = override?.staff ?? item.staff ?? "";

  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const title = escapeHtml(item.description);

  modal.innerHTML = `
    <h3>Edit ${title}</h3>
    <label for="timetable-edit-room">Room</label>
    <input type="text" id="timetable-edit-room" value="${roomValue.replace(/"/g, "&quot;")}" placeholder="Room" />
    <label for="timetable-edit-staff">Teacher</label>
    <input type="text" id="timetable-edit-staff" value="${staffValue.replace(/"/g, "&quot;")}" placeholder="Teacher" />
    <div class="timetable-edit-modal-checkbox">
      <input type="checkbox" id="timetable-edit-apply-future" />
      <label for="timetable-edit-apply-future">Apply to future weeks</label>
    </div>
    <div class="timetable-edit-modal-actions">
      ${override ? '<button type="button" class="timetable-edit-btn-clear">Clear</button>' : ""}
      <button type="button" class="timetable-edit-btn-cancel">Cancel</button>
      <button type="button" class="timetable-edit-btn-save">Save</button>
    </div>
  `;

  overlay.appendChild(modal);

  const removeModal = () => {
    overlay.remove();
    document.removeEventListener("keydown", handleKeydown);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") removeModal();
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) removeModal();
  });

  modal.addEventListener("click", (e) => e.stopPropagation());
  modal.addEventListener("mousedown", (e) => e.stopPropagation());
  modal.addEventListener("mouseup", (e) => e.stopPropagation());

  const roomInput = modal.querySelector(
    "#timetable-edit-room",
  ) as HTMLInputElement;
  const staffInput = modal.querySelector(
    "#timetable-edit-staff",
  ) as HTMLInputElement;
  const applyFutureCheckbox = modal.querySelector(
    "#timetable-edit-apply-future",
  ) as HTMLInputElement;

  modal
    .querySelector(".timetable-edit-btn-save")
    ?.addEventListener("click", () => {
      onSave(
        item.ci,
        roomInput.value.trim(),
        staffInput.value.trim(),
        applyFutureCheckbox?.checked ?? false,
      );
      removeModal();
    });

  modal
    .querySelector(".timetable-edit-btn-cancel")
    ?.addEventListener("click", removeModal);

  const clearBtn = modal.querySelector(".timetable-edit-btn-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      onClear(item.ci);
      removeModal();
    });
  }

  document.body.appendChild(overlay);
  document.addEventListener("keydown", handleKeydown);
  roomInput?.focus();
}

const timetableEditPlugin: Plugin<{}, TimetableStorage> = {
  id: "timetableEdit",
  name: "Edit Rooms & Teachers",
  description: "Edit room and teacher names in timetable classes",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  defaultEnabled: true,

  run: async (api) => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    await api.storage.loaded;

    let observer: MutationObserver | null = null;
    let quickbarObserver: MutationObserver | null = null;
    let lastClickedCi: number | null = null;
    let lastClickedEntry: {
      roomEl: HTMLElement | null;
      teacherEl: HTMLElement | null;
      item: TimetableEntryData;
    } | null = null;

    const getOverrides = (): TimetableOverrides =>
      api.storage.timetableOverrides ?? {};
    const getOverridesBySubject = (): TimetableOverridesBySubject =>
      api.storage.timetableOverridesBySubject ?? {};

    const getEffectiveOverride = (
      ci: number,
      description: string,
    ): { room?: string; staff?: string } | undefined =>
      getOverrides()[String(ci)] ?? getOverridesBySubject()[description];

    const processEntry = (entry: HTMLElement): void => {
      if (
        entry.classList.contains("assessment") ||
        entry.hasAttribute("data-timetable-edit-processed")
      )
        return;

      const ciStr = entry.getAttribute("data-instance");
      if (!ciStr) return;

      const ci = parseInt(ciStr, 10);
      if (isNaN(ci)) return;

      const { roomEl, teacherEl } = getRoomAndTeacherElements(entry);
      if (!roomEl && !teacherEl) return;

      const titleEl = entry.querySelector(".title");
      const description = titleEl?.textContent?.trim() ?? "";
      const room = roomEl?.textContent?.trim() ?? "";
      const staff = teacherEl?.textContent?.trim() ?? "";

      const item: TimetableEntryData = { ci, description, room, staff };

      entry.setAttribute("data-timetable-edit-processed", "true");

      const override = getEffectiveOverride(ci, description);
      if (override) {
        if (override.room !== undefined && roomEl)
          roomEl.textContent = override.room;
        if (override.staff !== undefined && teacherEl)
          teacherEl.textContent = override.staff;
      }

      const captureClick = () => {
        lastClickedCi = ci;
        lastClickedEntry = { roomEl, teacherEl, item };
      };
      entry.addEventListener("click", captureClick, true);
    };

    const processAllEntries = () => {
      document
        .querySelectorAll(".timetablepage .entry.class")
        .forEach((entry) => {
          processEntry(entry as HTMLElement);
        });
    };

    const addEditButtonToQuickbar = (quickbar: HTMLElement) => {
      if (quickbar.querySelector(".timetable-edit-quickbar-btn")) return;

      const actions = quickbar.querySelector(".actions");
      if (!actions) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "uiButton timetable-edit-quickbar-btn";
      btn.title = "Edit room and teacher";
      btn.innerHTML = EDIT_ICON_SVG;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ci = lastClickedCi;
        const entryData = lastClickedEntry;
        if (!ci || !entryData) return;

        const qb = (e.currentTarget as HTMLElement).closest(".quickbar");
        if (!qb) return;
        const quickbarRoom =
          qb.querySelector(".meta .room")?.textContent?.trim() ?? "";
        const quickbarTeacher =
          qb.querySelector(".meta .teacher")?.textContent?.trim() ?? "";
        const quickbarTitle =
          qb.querySelector(".title")?.textContent?.trim() ?? "";
        const item: TimetableEntryData = {
          ci,
          description: quickbarTitle || entryData.item.description,
          room: quickbarRoom || entryData.item.room,
          staff: quickbarTeacher || entryData.item.staff,
        };

        showEditModal(
          item,
          getOverrides(),
          getOverridesBySubject(),
          (ci, room, staff, applyToFuture) => {
            if (applyToFuture) {
              const bySubject = { ...getOverridesBySubject() };
              bySubject[item.description] = {
                room: room || undefined,
                staff: staff || undefined,
              };
              api.storage.timetableOverridesBySubject = bySubject;
            } else {
              const current = getOverrides();
              api.storage.timetableOverrides = {
                ...current,
                [String(ci)]: {
                  room: room || undefined,
                  staff: staff || undefined,
                },
              };
            }
            if (entryData.roomEl) entryData.roomEl.textContent = room;
            if (entryData.teacherEl) entryData.teacherEl.textContent = staff;
            processAllEntries();
          },
          (ci) => {
            const current = getOverrides();
            delete current[String(ci)];
            api.storage.timetableOverrides = current;
            const bySubject = getOverridesBySubject();
            delete bySubject[item.description];
            api.storage.timetableOverridesBySubject = bySubject;
            if (entryData.roomEl) entryData.roomEl.textContent = item.room;
            if (entryData.teacherEl)
              entryData.teacherEl.textContent = item.staff;
            processAllEntries();
          },
        );
      });

      actions.insertBefore(btn, actions.firstChild);
    };

    const syncQuickbarFromDOM = () => {
      const quickbar = document.querySelector(
        ".timetablepage .quickbar.visible",
      );
      if (quickbar && quickbar.getAttribute("data-type") === "class") {
        const titleEl = quickbar.querySelector(".title");
        const roomEl = quickbar.querySelector(".meta .room");
        const teacherEl = quickbar.querySelector(".meta .teacher");
        if (
          titleEl &&
          roomEl &&
          teacherEl &&
          lastClickedCi !== null &&
          lastClickedEntry
        ) {
          addEditButtonToQuickbar(quickbar as HTMLElement);
        }
      }
    };

    const setupQuickbarObserver = () => {
      const timetablePage = document.querySelector(".timetablepage");
      if (!timetablePage || quickbarObserver) return;

      quickbarObserver = new MutationObserver(() => {
        const quickbar = document.querySelector(
          ".timetablepage .quickbar.visible",
        );
        if (quickbar?.getAttribute("data-type") === "class") {
          addEditButtonToQuickbar(quickbar as HTMLElement);
        }
      });

      quickbarObserver.observe(timetablePage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    };

    const handleTimetable = async () => {
      await waitForElm(".timetablepage .entry", true, 10, 100);
      processAllEntries();
      setupQuickbarObserver();
      syncQuickbarFromDOM();

      const timetablePage = document.querySelector(".timetablepage");
      if (timetablePage && !observer) {
        observer = new MutationObserver(() => {
          document
            .querySelectorAll(".timetablepage .entry.class")
            .forEach((entry) => {
              if (!entry.hasAttribute("data-timetable-edit-processed")) {
                processEntry(entry as HTMLElement);
              }
            });
        });
        observer.observe(timetablePage, { childList: true, subtree: true });
      }
    };

    const { unregister } = api.seqta.onMount(".timetablepage", handleTimetable);

    return () => {
      unregister();
      observer?.disconnect();
      quickbarObserver?.disconnect();
      styleEl.remove();
      document
        .querySelectorAll("[data-timetable-edit-processed]")
        .forEach((el) => {
          el.removeAttribute("data-timetable-edit-processed");
        });
      document
        .querySelectorAll(".timetable-edit-quickbar-btn")
        .forEach((el) => el.remove());
    };
  },
};

export default timetableEditPlugin;
