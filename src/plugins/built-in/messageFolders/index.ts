import type { Plugin } from "../../core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";

interface Folder {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

const FOLDER_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const folderHeroicon = (inner: string) =>
  `<svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const FOLDER_HEROICONS = [
  folderHeroicon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  folderHeroicon('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
  folderHeroicon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  folderHeroicon('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'),
  folderHeroicon('<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'),
  folderHeroicon('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>'),
  folderHeroicon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'),
  folderHeroicon('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
  folderHeroicon('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
  folderHeroicon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
  folderHeroicon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  folderHeroicon('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
  folderHeroicon('<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  folderHeroicon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
  folderHeroicon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  folderHeroicon('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
];

const FOLDER_ICON_SVG = `<svg style="width:24px;height:24px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
const PLUS_SVG = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
const CHECK_SVG_WHITE = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#fff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const CLOSE_SVG = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;
const EDIT_SVG = `<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const TRASH_SVG = `<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
const CHEVRON_SVG = `<svg style="width:12px;height:12px;flex-shrink:0;transition:transform .2s" viewBox="0 0 24 24"><path fill="#888" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
const DRAG_SVG = `<svg style="width:14px;height:14px;flex-shrink:0;cursor:grab" viewBox="0 0 24 24"><path fill="#888" d="M6.5 12.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5.5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>`;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function isAllowedFolderColor(color: unknown): color is string {
  return typeof color === "string" && FOLDER_COLORS.includes(color);
}

function isAllowedFolderIcon(icon: unknown): icon is string {
  return typeof icon === "string" && FOLDER_HEROICONS.includes(icon);
}

function normalizeFolder(folder: Folder): Folder {
  return {
    id: typeof folder.id === "string" && folder.id ? folder.id : generateId(),
    name: typeof folder.name === "string" ? folder.name.trim().slice(0, 30) : "Folder",
    color: isAllowedFolderColor(folder.color) ? folder.color : FOLDER_COLORS[0],
    emoji: isAllowedFolderIcon(folder.emoji) ? folder.emoji : FOLDER_HEROICONS[0],
  };
}

function setSvgIconContent(parent: HTMLElement, svgMarkup: string): void {
  parent.replaceChildren();
  const template = document.createElement("template");
  template.innerHTML = svgMarkup.trim();
  const node = template.content.firstElementChild;
  if (node) parent.appendChild(node);
}

function appendFolderBadgeContent(badge: HTMLElement, folder: Folder): void {
  badge.replaceChildren();
  if (folder.emoji) {
    const iconWrap = document.createElement("span");
    iconWrap.style.display = "inline-flex";
    iconWrap.style.verticalAlign = "middle";
    iconWrap.style.marginRight = "2px";
    setSvgIconContent(iconWrap, folder.emoji);
    badge.appendChild(iconWrap);
  }
  badge.appendChild(document.createTextNode(folder.name));
}

const MESSAGE_LIST_ITEM_SELECTOR =
  "[class*='MessageList__MessageList___'] ol > li[data-message]";

function getMessageListItems(): NodeListOf<Element> {
  return document.querySelectorAll(MESSAGE_LIST_ITEM_SELECTOR);
}

function clearMessageListBadges(
  messageItems: NodeListOf<Element>,
  restoreSubjectPlain: (subject: Element) => void,
): void {
  for (const li of messageItems) {
    const subject = li.querySelector("[class*='MessageList__subject___']");
    if (
      subject &&
      (subject.querySelector(".bsplus-msg-badges") ||
        subject.querySelector(".bsplus-subject-text"))
    ) {
      restoreSubjectPlain(subject);
    } else {
      li.querySelector(".bsplus-msg-badges")?.remove();
    }
  }
}

function getAssignedFolderIds(
  msgId: string,
  assignments: Record<string, string[]>,
): string[] {
  return Object.entries(assignments)
    .filter(([, messageIds]) => messageIds.includes(msgId))
    .map(([folderId]) => folderId);
}

function ensureMessageBadgeContainer(li: Element): HTMLElement {
  const existing = li.querySelector(".bsplus-msg-badges") as HTMLElement | null;
  if (existing) return existing;

  const badgeContainer = document.createElement("div");
  badgeContainer.className = "bsplus-msg-badges";
  const subject = li.querySelector("[class*='MessageList__subject___']");
  if (subject) {
    if (!subject.querySelector(".bsplus-subject-text")) {
      const textWrap = document.createElement("span");
      textWrap.className = "bsplus-subject-text";
      textWrap.textContent = subject.textContent;
      subject.textContent = "";
      subject.appendChild(textWrap);
    }
    subject.appendChild(badgeContainer);
  } else {
    li.appendChild(badgeContainer);
  }
  return badgeContainer;
}

function createFolderBadge(
  folder: Folder,
  onFilter: (folderId: string) => void,
): HTMLElement {
  const badge = document.createElement("span");
  badge.className = "bsplus-msg-badge";
  badge.style.background = folder.color;
  appendFolderBadgeContent(badge, folder);
  badge.title = `Filter by "${folder.name}"`;
  badge.addEventListener("click", (e) => {
    e.stopPropagation();
    onFilter(folder.id);
  });
  return badge;
}

const messageFoldersPlugin = {
  run: async (api: Parameters<NonNullable<Plugin["run"]>>[0]) => {
    await api.storage.loaded;

    if (!api.storage.folders) api.storage.folders = [];
    if (!api.storage.messageAssignments) api.storage.messageAssignments = {};

    let activeFolderId: string | null = null;
    let messageListObserver: MutationObserver | null = null;
    let sidebarObserver: MutationObserver | null = null;
    let actionsObserver: MutationObserver | null = null;
    let openDropdown: HTMLElement | null = null;
    let dropdownCloseHandler: ((e: MouseEvent) => void) | null = null;
    const unregisters: Array<{ unregister: () => void }> = [];

    const getFolders = (): Folder[] =>
      (api.storage.folders ?? []).map((folder) => normalizeFolder(folder));
    const getAssignments = (): Record<string, string[]> => api.storage.messageAssignments ?? {};

    const saveFolders = (folders: Folder[]) => {
      api.storage.folders = [...folders];
    };

    const saveAssignments = (assignments: Record<string, string[]>) => {
      api.storage.messageAssignments = { ...assignments };
    };

    const assignMessageToFolder = (messageId: string, folderId: string) => {
      const assignments = getAssignments();
      if (!assignments[folderId]) assignments[folderId] = [];
      if (!assignments[folderId].includes(messageId)) {
        assignments[folderId].push(messageId);
      }
      saveAssignments(assignments);
    };

    const toggleMessageInFolder = (messageId: string, folderId: string) => {
      const assignments = getAssignments();
      if (!assignments[folderId]) assignments[folderId] = [];
      const idx = assignments[folderId].indexOf(messageId);
      if (idx >= 0) {
        assignments[folderId].splice(idx, 1);
      } else {
        assignments[folderId].push(messageId);
      }
      saveAssignments(assignments);
    };

    const getFolderMessageCount = (folderId: string): number => {
      return (getAssignments()[folderId] ?? []).length;
    };

    const restoreSubjectPlain = (subject: Element) => {
      subject.querySelector(".bsplus-msg-badges")?.remove();
      const textWrap = subject.querySelector(".bsplus-subject-text");
      if (textWrap) {
        subject.textContent = textWrap.textContent ?? "";
      }
    };

    const isMessageInAnyCustomFolder = (messageId: string): boolean =>
      getAssignedFolderIds(messageId, getAssignments()).length > 0;

    const shouldShowBadgesInList = (): boolean => {
      return api.settings.showTagsInAllMessages || activeFolderId !== null;
    };

    const showConfirmModal = (title: string, message: string, onConfirm: () => void) => {
      const overlay = document.createElement("div");
      overlay.className = "bsplus-modal-overlay";
      const modal = document.createElement("div");
      modal.className = "bsplus-modal";
      modal.innerHTML = `
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="bsplus-modal-actions">
          <button class="bsplus-modal-btn-cancel">Cancel</button>
          <button class="bsplus-modal-btn-danger">Delete</button>
        </div>
      `;
      overlay.appendChild(modal);
      const remove = () => {
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") remove();
      };
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) remove();
      });
      modal.querySelector(".bsplus-modal-btn-cancel")!.addEventListener("click", remove);
      modal.querySelector(".bsplus-modal-btn-danger")!.addEventListener("click", () => {
        onConfirm();
        remove();
      });
      document.body.appendChild(overlay);
      document.addEventListener("keydown", onKey);
    };

    const renderSidebarFolders = () => {
      const sidebar = document.querySelector("[class*='Viewer__sidebar___']");
      if (!sidebar) return;
      const ol = sidebar.querySelector("ol");
      if (!ol) return;

      let section = ol.querySelector(".bsplus-folders-section") as HTMLElement;
      if (!section) {
        section = document.createElement("div");
        section.className = "bsplus-folders-section";
        ol.appendChild(section);
      }

      const folders = getFolders();
      section.innerHTML = "";

      const header = document.createElement("div");
      header.className = "bsplus-folders-header";

      const collapseBtn = document.createElement("button");
      collapseBtn.className = "bsplus-folders-collapse";
      collapseBtn.innerHTML = CHEVRON_SVG;
      collapseBtn.title = "Collapse";
      collapseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isFolded = collapseBtn.classList.toggle("bsplus-folded");
        section.classList.toggle("bsplus-section-folded", isFolded);
        collapseBtn.title = isFolded ? "Expand" : "Collapse";
      });
      header.appendChild(collapseBtn);

      const label = document.createElement("span");
      label.textContent = "Folders";
      header.appendChild(label);

      const addBtn = document.createElement("button");
      addBtn.className = "bsplus-folders-add-btn";
      addBtn.title = "New folder";
      addBtn.innerHTML = PLUS_SVG;
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showNewFolderInput(section!);
      });
      header.appendChild(addBtn);
      section.appendChild(header);

      const allItem = document.createElement("div");
      allItem.className = `bsplus-folder-item bsplus-all-msgs${activeFolderId === null ? " bsplus-folder-active" : ""}`;
      allItem.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" style="fill: currentcolor; opacity: 0.5; flex-shrink: 0;"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        <span class="bsplus-folder-name">All Messages</span>
      `;
      allItem.addEventListener("click", () => {
        activeFolderId = null;
        applyFolderFilter();
        applyBadges();
        renderSidebarFolders();
        setTimeout(() => {
          applyFolderFilter();
          applyBadges();
        }, 100);
      });
      section.appendChild(allItem);

      for (const folder of folders) {
        const item = document.createElement("div");
        item.className = `bsplus-folder-item${activeFolderId === folder.id ? " bsplus-folder-active" : ""}`;
        item.dataset.folderId = folder.id;
        item.draggable = true;

        const dragHandle = document.createElement("div");
        dragHandle.className = "bsplus-folder-drag";
        dragHandle.innerHTML = DRAG_SVG;
        item.appendChild(dragHandle);

        const dot = document.createElement("div");
        dot.className = "bsplus-folder-dot";
        dot.style.background = folder.color;
        item.appendChild(dot);

        const iconSpan = document.createElement("span");
        iconSpan.className = "bsplus-folder-icon";
        setSvgIconContent(iconSpan, folder.emoji || FOLDER_HEROICONS[0]);
        item.appendChild(iconSpan);

        const name = document.createElement("span");
        name.className = "bsplus-folder-name";
        name.textContent = folder.name;
        item.appendChild(name);

        const actions = document.createElement("div");
        actions.className = "bsplus-folder-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "bsplus-folder-action-btn";
        editBtn.title = "Rename";
        editBtn.innerHTML = EDIT_SVG;
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showNewFolderInput(section!, folder);
        });
        actions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "bsplus-folder-action-btn";
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = TRASH_SVG;
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showConfirmModal("Delete folder", `Remove "${folder.name}"? Messages won't be deleted.`, () => {
            const folders = getFolders().filter((f) => f.id !== folder.id);
            saveFolders(folders);
            const assignments = getAssignments();
            delete assignments[folder.id];
            saveAssignments(assignments);
            if (activeFolderId === folder.id) activeFolderId = null;
            applyFolderFilter();
            applyBadges();
            renderSidebarFolders();
          });
        });
        actions.appendChild(deleteBtn);

        item.appendChild(actions);

        const count = document.createElement("span");
        count.className = "bsplus-folder-count";
        const c = getFolderMessageCount(folder.id);
        count.textContent = c > 0 ? String(c) : "";
        item.appendChild(count);

        item.addEventListener("click", () => {
          activeFolderId = folder.id;
          applyFolderFilter();
          applyBadges();
          renderSidebarFolders();
          setTimeout(() => {
            applyFolderFilter();
            applyBadges();
          }, 100);
        });

        item.addEventListener("dragstart", (e) => {
          e.dataTransfer?.setData("text/plain", `reorder:${folder.id}`);
          item.classList.add("bsplus-dragging");
        });
        item.addEventListener("dragend", () => {
          item.classList.remove("bsplus-dragging");
          document.querySelectorAll(".bsplus-folder-item").forEach((el) => el.classList.remove("bsplus-drag-over"));
        });
        item.addEventListener("dragover", (e) => {
          e.preventDefault();
          const data = e.dataTransfer?.getData("text/plain") || "";
          if (data.startsWith("reorder:") && !data.includes(folder.id)) {
            item.classList.add("bsplus-drag-over");
          }
        });
        item.addEventListener("dragleave", () => {
          item.classList.remove("bsplus-drag-over");
        });
        item.addEventListener("drop", (e) => {
          e.preventDefault();
          item.classList.remove("bsplus-drag-over");
          const data = e.dataTransfer?.getData("text/plain") || "";
          if (data.startsWith("reorder:")) {
            const draggedId = data.replace("reorder:", "");
            const folders = getFolders();
            const draggedIdx = folders.findIndex((f) => f.id === draggedId);
            const targetIdx = folders.findIndex((f) => f.id === folder.id);
            if (draggedIdx >= 0 && targetIdx >= 0 && draggedIdx !== targetIdx) {
              const [removed] = folders.splice(draggedIdx, 1);
              folders.splice(targetIdx, 0, removed);
              saveFolders(folders);
              renderSidebarFolders();
            }
          }
        });

        section.appendChild(item);
      }

      section.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      section.addEventListener("drop", (e) => {
        e.preventDefault();
        const data = e.dataTransfer?.getData("text/plain") || "";
        if (data.startsWith("msg:")) {
          const messageId = data.replace("msg:", "");
          const folderId = (e.target as HTMLElement).closest("[data-folder-id]")?.getAttribute("data-folder-id");
          if (messageId && folderId) {
            assignMessageToFolder(messageId, folderId);
            applyBadges();
            applyFolderFilter();
            renderSidebarFolders();
          }
        }
      });

      attachDragListeners();
    };

    const attachDragListeners = () => {
      getMessageListItems().forEach((li) => {
        if (li.getAttribute("data-bsplus-drag") === "true") return;
        li.setAttribute("data-bsplus-drag", "true");
        li.draggable = true;
        li.addEventListener("dragstart", (e) => {
          const id = li.getAttribute("data-message");
          if (id) {
            e.dataTransfer?.setData("text/plain", `msg:${id}`);
            li.classList.add("bsplus-msg-dragging");
          }
        });
        li.addEventListener("dragend", () => {
          li.classList.remove("bsplus-msg-dragging");
          document.querySelectorAll(".bsplus-folder-item").forEach((el) => el.classList.remove("bsplus-drag-over"));
        });
      });
    };

    const showNewFolderInput = (container: Element, editFolder?: Folder) => {
      const existing = container.querySelector(".bsplus-folder-input");
      if (existing) existing.remove();
      container.querySelector(".bsplus-folder-colors")?.remove();

      let selectedColor = editFolder?.color ?? FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
      let selectedIcon = editFolder?.emoji ?? FOLDER_HEROICONS[Math.floor(Math.random() * FOLDER_HEROICONS.length)];

      const row = document.createElement("div");
      row.className = "bsplus-folder-input";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = editFolder ? "Rename folder\u2026" : "Folder name\u2026";
      input.value = editFolder?.name ?? "";
      input.maxLength = 30;

      const iconBtn = document.createElement("button");
      iconBtn.className = "bsplus-folder-icon-btn";
      iconBtn.title = "Pick icon";
      iconBtn.innerHTML = selectedIcon;
      iconBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const picker = container.querySelector(".bsplus-icon-picker") as HTMLElement | null;
        if (picker) {
          picker.remove();
          return;
        }
        showIconPicker(container, (iconSvg) => {
          selectedIcon = iconSvg;
          iconBtn.innerHTML = iconSvg;
        });
      });

      const confirmBtn = document.createElement("button");
      confirmBtn.className = "bsplus-folder-input-confirm";
      confirmBtn.innerHTML = CHECK_SVG_WHITE;

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "bsplus-folder-input-cancel";
      cancelBtn.innerHTML = CLOSE_SVG;

      row.appendChild(iconBtn);
      row.appendChild(input);
      row.appendChild(confirmBtn);
      row.appendChild(cancelBtn);

      const colorRow = document.createElement("div");
      colorRow.className = "bsplus-folder-colors";
      for (const color of FOLDER_COLORS) {
        const swatch = document.createElement("button");
        swatch.className = `bsplus-folder-color-opt${color === selectedColor ? " bsplus-color-selected" : ""}`;
        swatch.style.background = color;
        swatch.addEventListener("click", (e) => {
          e.stopPropagation();
          selectedColor = color;
          colorRow.querySelectorAll(".bsplus-folder-color-opt").forEach((s) =>
            s.classList.toggle("bsplus-color-selected", (s as HTMLElement).style.background === color),
          );
        });
        colorRow.appendChild(swatch);
      }

      const confirm = () => {
        const name = input.value.trim();
        if (!name) return;
        if (editFolder) {
          const folders = getFolders().map((f) =>
            f.id === editFolder.id ? { ...f, name, color: selectedColor, emoji: selectedIcon } : f,
          );
          saveFolders(folders);
        } else {
          const folder: Folder = { id: generateId(), name, color: selectedColor, emoji: selectedIcon };
          saveFolders([...getFolders(), folder]);
        }
        applyBadges();
        renderSidebarFolders();
      };

      confirmBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        confirm();
      });
      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        renderSidebarFolders();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirm();
        if (e.key === "Escape") renderSidebarFolders();
      });

      container.appendChild(row);
      container.appendChild(colorRow);
      requestAnimationFrame(() => input.focus());
    };

    const showIconPicker = (container: Element, onSelect: (iconSvg: string) => void) => {
      const existing = container.querySelector(".bsplus-icon-picker");
      if (existing) existing.remove();

      const picker = document.createElement("div");
      picker.className = "bsplus-icon-picker";
      for (const icon of FOLDER_HEROICONS) {
        const btn = document.createElement("button");
        btn.className = "bsplus-icon-opt";
        btn.innerHTML = icon;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(icon);
          picker.remove();
        });
        picker.appendChild(btn);
      }
      container.appendChild(picker);
    };

    const attachNativeSidebarListeners = () => {
      const sidebar = document.querySelector("[class*='Viewer__sidebar___']");
      if (!sidebar) return;
      const ol = sidebar.querySelector("ol");
      if (!ol) return;
      ol.addEventListener("click", (e) => {
        const target = e.target as HTMLElement;
        if (target.closest(".bsplus-folders-section")) return;
        const li = target.closest("li");
        if (li && ol.contains(li)) {
          if (activeFolderId !== null) {
            activeFolderId = null;
            applyFolderFilter();
            applyBadges();
            renderSidebarFolders();
          }
        }
      });
    };

    const closeDropdown = () => {
      if (openDropdown) {
        openDropdown.remove();
        openDropdown = null;
      }
      if (dropdownCloseHandler) {
        document.removeEventListener("click", dropdownCloseHandler, true);
        dropdownCloseHandler = null;
      }
    };

    const showFolderDropdown = (anchor: HTMLElement, messageId: string) => {
      closeDropdown();
      const dropdown = document.createElement("div");
      dropdown.className = "bsplus-folder-dropdown";
      dropdown.dataset.msgId = messageId;

      const folders = getFolders();
      const currentFolderIds = getAssignedFolderIds(messageId, getAssignments());

      if (folders.length === 0) {
        const empty = document.createElement("div");
        empty.className = "bsplus-folder-dropdown-empty";
        empty.textContent = "No folders yet";
        dropdown.appendChild(empty);
      } else {
        for (const folder of folders) {
          const isChecked = currentFolderIds.includes(folder.id);
          const item = document.createElement("button");
          item.className = `bsplus-folder-dropdown-item${isChecked ? " bsplus-checked" : ""}`;
          item.dataset.folderId = folder.id;

          const check = document.createElement("div");
          check.className = "bsplus-folder-dropdown-check";
          check.style.borderColor = isChecked ? folder.color : "";
          check.style.background = isChecked ? folder.color : "";
          check.innerHTML = CHECK_SVG_WHITE;

          const dot = document.createElement("div");
          dot.className = "bsplus-folder-dot";
          dot.style.background = folder.color;

          const iconSpan = document.createElement("span");
          iconSpan.className = "bsplus-folder-icon";
          setSvgIconContent(iconSpan, folder.emoji || FOLDER_HEROICONS[0]);

          const name = document.createElement("span");
          name.textContent = folder.name;

          item.appendChild(check);
          item.appendChild(dot);
          item.appendChild(iconSpan);
          item.appendChild(name);

          item.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleMessageInFolder(messageId, folder.id);
            const nowChecked = getAssignedFolderIds(messageId, getAssignments()).includes(folder.id);
            item.classList.toggle("bsplus-checked", nowChecked);
            check.style.borderColor = nowChecked ? folder.color : "";
            check.style.background = nowChecked ? folder.color : "";
            applyBadges();
            applyFolderFilter();
            renderSidebarFolders();
          });

          dropdown.appendChild(item);
        }
      }

      anchor.appendChild(dropdown);
      openDropdown = dropdown;

      dropdownCloseHandler = (e: MouseEvent) => {
        if (!dropdown.contains(e.target as Node) && !anchor.contains(e.target as Node)) {
          closeDropdown();
        }
      };
      setTimeout(() => {
        document.addEventListener("click", dropdownCloseHandler!, true);
      }, 0);
    };

    const injectFolderButton = (actionsBar: Element) => {
      if (actionsBar.querySelector(".bsplus-folder-btn")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "bsplus-folder-btn";
      wrapper.style.position = "relative";
      wrapper.style.display = "inline-block";
      const btn = document.createElement("button");
      const btnClasses = actionsBar.querySelector("button")?.className ?? "";
      btn.className = btnClasses;
      btn.title = "Add to folder";
      btn.innerHTML = FOLDER_ICON_SVG;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedMsg = document.querySelector("[class*='MessageList__selected___']");
        const messageId = selectedMsg?.getAttribute("data-message");
        if (!messageId) return;
        showFolderDropdown(wrapper, messageId);
      });
      wrapper.appendChild(btn);
      const moreMenu = actionsBar.querySelector("[class*='MenuButton__Menu___']");
      if (moreMenu) {
        actionsBar.insertBefore(wrapper, moreMenu);
      } else {
        actionsBar.appendChild(wrapper);
      }
    };

    const showContextMenu = (e: MouseEvent, messageId: string) => {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
      const existing = document.querySelector(".bsplus-context-menu");
      if (existing) existing.remove();

      const menu = document.createElement("div");
      menu.className = "bsplus-context-menu";
      menu.style.left = `${e.clientX}px`;
      menu.style.top = `${e.clientY}px`;

      const title = document.createElement("div");
      title.className = "bsplus-context-title";
      title.textContent = "Add to folder";
      menu.appendChild(title);

      const folders = getFolders();
      const currentFolderIds = getAssignedFolderIds(messageId, getAssignments());

      if (folders.length === 0) {
        const empty = document.createElement("div");
        empty.className = "bsplus-context-empty";
        empty.textContent = "No folders";
        menu.appendChild(empty);
      } else {
        for (const folder of folders) {
          const isChecked = currentFolderIds.includes(folder.id);
          const item = document.createElement("button");
          item.className = `bsplus-context-item${isChecked ? " bsplus-context-checked" : ""}`;
          const dot = document.createElement("div");
          dot.className = "bsplus-folder-dot";
          dot.style.background = folder.color;
          const iconSpan = document.createElement("span");
          iconSpan.className = "bsplus-folder-icon";
          setSvgIconContent(iconSpan, folder.emoji || FOLDER_HEROICONS[0]);
          const name = document.createElement("span");
          name.textContent = folder.name;
          item.appendChild(dot);
          item.appendChild(iconSpan);
          item.appendChild(name);
          if (isChecked) {
            const check = document.createElement("span");
            check.className = "bsplus-context-checkmark";
            check.textContent = "\u2713";
            item.appendChild(check);
          }
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleMessageInFolder(messageId, folder.id);
            applyBadges();
            applyFolderFilter();
            renderSidebarFolders();
            menu.remove();
          });
          menu.appendChild(item);
        }
      }

      document.body.appendChild(menu);
      const closeMenu = (ev: MouseEvent) => {
        if (!menu.contains(ev.target as Node)) {
          menu.remove();
          document.removeEventListener("click", closeMenu);
        }
      };
      setTimeout(() => document.addEventListener("click", closeMenu), 0);
    };

    const applyBadges = () => {
      const messageItems = getMessageListItems();
      if (!shouldShowBadgesInList()) {
        clearMessageListBadges(messageItems, restoreSubjectPlain);
        return;
      }

      const folders = getFolders();
      const assignments = getAssignments();
      const selectFolder = (folderId: string) => {
        activeFolderId = folderId;
        applyFolderFilter();
        applyBadges();
        renderSidebarFolders();
      };

      for (const li of messageItems) {
        const msgId = li.getAttribute("data-message");
        if (!msgId) continue;

        const folderIds = getAssignedFolderIds(msgId, assignments);
        if (folderIds.length === 0) {
          li.querySelector(".bsplus-msg-badges")?.remove();
          continue;
        }

        const badgeContainer = ensureMessageBadgeContainer(li);
        badgeContainer.replaceChildren();
        for (const folderId of folderIds) {
          const folder = folders.find((f) => f.id === folderId);
          if (!folder) continue;
          badgeContainer.appendChild(createFolderBadge(folder, selectFolder));
        }
      }
    };

    const applyFolderFilter = () => {
      const messageItems = getMessageListItems();
      const moreBtn = document.querySelector("[class*='MessageList__MessageList___'] ol > button");
      if (activeFolderId === null) {
        if (api.settings.hideFolderedMessagesInAll) {
          for (const li of messageItems) {
            const msgId = li.getAttribute("data-message");
            if (msgId && isMessageInAnyCustomFolder(msgId)) {
              li.classList.add("bsplus-folder-hidden");
            } else {
              li.classList.remove("bsplus-folder-hidden");
            }
          }
        } else {
          for (const li of messageItems) {
            li.classList.remove("bsplus-folder-hidden");
          }
        }
        if (moreBtn) (moreBtn as HTMLElement).classList.remove("bsplus-folder-hidden");
        return;
      }
      const folderMsgIds = getAssignments()[activeFolderId] ?? [];
      for (const li of messageItems) {
        const msgId = li.getAttribute("data-message");
        if (msgId && folderMsgIds.includes(msgId)) {
          li.classList.remove("bsplus-folder-hidden");
        } else {
          li.classList.add("bsplus-folder-hidden");
        }
      }
      if (moreBtn) (moreBtn as HTMLElement).classList.add("bsplus-folder-hidden");
    };

    const setupMessageListObserver = () => {
      const messageList = document.querySelector("[class*='MessageList__MessageList___'] ol");
      if (!messageList || messageListObserver) return;
      messageListObserver = new MutationObserver(() => {
        applyBadges();
        applyFolderFilter();
        attachDragListeners();
        attachContextMenuListeners();
      });
      messageListObserver.observe(messageList, { childList: true, subtree: false });
    };

    const attachContextMenuListeners = () => {
      getMessageListItems().forEach((li) => {
        if (li.getAttribute("data-bsplus-ctx") === "true") return;
        li.setAttribute("data-bsplus-ctx", "true");
        li.addEventListener("contextmenu", (e) => {
          const msgId = li.getAttribute("data-message");
          if (msgId) {
            showContextMenu(e, msgId);
          }
        });
      });
    };

    const setupActionsObserver = () => {
      if (actionsObserver) return;
      const target = document.querySelector("[class*='Viewer__Viewer___']") ?? document.querySelector("div.messages");
      if (!target) return;
      actionsObserver = new MutationObserver(() => {
        const actionsBar = document.querySelector("[class*='Message__actions___']");
        if (actionsBar && !actionsBar.querySelector(".bsplus-folder-btn")) {
          injectFolderButton(actionsBar);
        }
      });
      actionsObserver.observe(target, { childList: true, subtree: true });
    };

    const handleMessagesPage = async () => {
      await waitForElm("[class*='Viewer__sidebar___'] ol", true, 50, 100);
      renderSidebarFolders();
      attachNativeSidebarListeners();
      await waitForElm("[class*='MessageList__MessageList___'] ol", true, 50, 100);
      applyBadges();
      applyFolderFilter();
      setupMessageListObserver();
      setupActionsObserver();
      attachDragListeners();
      attachContextMenuListeners();
      const actionsBar = document.querySelector("[class*='Message__actions___']");
      if (actionsBar) injectFolderButton(actionsBar);
      const sidebar = document.querySelector("[class*='Viewer__sidebar___']");
      if (sidebar && !sidebarObserver) {
        sidebarObserver = new MutationObserver(() => {
          const ol = sidebar.querySelector("ol");
          if (ol && !ol.querySelector(".bsplus-folders-section")) {
            renderSidebarFolders();
            attachNativeSidebarListeners();
          }
        });
        sidebarObserver.observe(sidebar, { childList: true, subtree: true });
      }
    };

    const mountUnsub = api.seqta.onMount("div.messages", handleMessagesPage);
    unregisters.push(mountUnsub);
    unregisters.push(
      api.settings.onChange("showTagsInAllMessages", () => {
        applyBadges();
      }),
    );
    unregisters.push(
      api.settings.onChange("hideFolderedMessagesInAll", () => {
        applyFolderFilter();
      }),
    );

    return () => {
      for (const u of unregisters) u.unregister();
      messageListObserver?.disconnect();
      sidebarObserver?.disconnect();
      actionsObserver?.disconnect();
      closeDropdown();
      document.querySelectorAll(".bsplus-folders-section").forEach((el) => el.remove());
      document.querySelectorAll(".bsplus-folder-btn").forEach((el) => el.remove());
      document.querySelectorAll(".bsplus-msg-badges").forEach((el) => el.remove());
      document.querySelectorAll(".bsplus-context-menu").forEach((el) => el.remove());
      document.querySelectorAll("[class*='MessageList__subject___']").forEach((subject) => {
        if (subject.querySelector(".bsplus-subject-text")) {
          restoreSubjectPlain(subject);
        }
      });
      document.querySelectorAll(".bsplus-folder-hidden").forEach((el) =>
        el.classList.remove("bsplus-folder-hidden"),
      );
      document.querySelectorAll(".bsplus-modal-overlay").forEach((el) => el.remove());

    };
  },
};

export default messageFoldersPlugin;
