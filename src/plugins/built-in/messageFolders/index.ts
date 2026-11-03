import { icon } from "@/lib/icon";
import {
  Book,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Flame,
  Folder,
  GripHorizontal,
  Heart,
  House,
  Inbox,
  Lightbulb,
  MessageSquare,
  Music,
  NotepadText,
  Pencil,
  Plus,
  Star,
  Target,
  Trash,
  Users,
  X,
} from "lucide-static";
import type { Plugin } from "../../core/types";
import type { MessageFoldersSettings } from "./lazy";
import { waitForElm } from "@/seqta/utils/waitForElm";

interface Folder {
  id: string;
  name: string;
  color: string;
  icon: FolderIconName;
  emoji?: string;
}

const FOLDER_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const FOLDER_ICONS = {
  folder: Folder,
  inbox: Inbox,
  star: Star,
  heart: Heart,
  flame: Flame,
  lightbulb: Lightbulb,
  "file-text": FileText,
  target: Target,
  calendar: Calendar,
  "notepad-text": NotepadText,
  users: Users,
  "message-square": MessageSquare,
  briefcase: Briefcase,
  house: House,
  book: Book,
  music: Music,
};

type FolderIconName = keyof typeof FOLDER_ICONS;

const FOLDER_ICON_NAMES = Object.keys(FOLDER_ICONS) as FolderIconName[];

const LEGACY_FOLDER_ICON_MARKERS: [string, FolderIconName][] = [
  ["10 9 9 9 8 9", "file-text"],
  ["M22 19a2", "folder"],
  ["22 12 16 12", "inbox"],
  ["12 2 15.09", "star"],
  ["M20.84 4.61", "heart"],
  ["M8.5 14.5", "flame"],
  ["M9 18h6", "lightbulb"],
  ["M14 2H6", "notepad-text"],
  ['r="10"', "target"],
  ['y="4" width="18"', "calendar"],
  ["M17 21v-2", "users"],
  ["M21 15a2", "message-square"],
  ['y="7" width="20"', "briefcase"],
  ["M3 9l9-7", "house"],
  ["M4 19.5A2.5", "book"],
  ["M9 18V5", "music"],
];

const folderIconSvg = (name: FolderIconName) => icon(FOLDER_ICONS[name], { size: 16 });

const FOLDER_ICON_SVG = icon(Folder);
const PLUS_SVG = icon(Plus, { size: 14, style: "color: #888" });
const CHECK_SVG_WHITE = icon(Check, { size: 14, style: "color: #fff" });
const CLOSE_SVG = icon(X, { size: 14, style: "color: #888" });
const EDIT_SVG = icon(Pencil, { size: 12, style: "color: #888" });
const TRASH_SVG = icon(Trash, { size: 12, style: "color: #888" });
const CHEVRON_SVG = icon(ChevronDown, {
  size: 12,
  style: "color: #888; transition: transform 0.2s",
});
const DRAG_SVG = icon(GripHorizontal, { size: 14, style: "color: #888; cursor: grab" });

function isAllowedFolderColor(color: unknown): color is string {
  return typeof color === "string" && FOLDER_COLORS.includes(color);
}

function folderIconName(value: unknown): FolderIconName {
  if (typeof value !== "string") return "folder";
  if (Object.hasOwn(FOLDER_ICONS, value)) return value as FolderIconName;
  return LEGACY_FOLDER_ICON_MARKERS.find(([marker]) => value.includes(marker))?.[1] ?? "folder";
}

function normalizeFolder(folder: Folder): Folder {
  return {
    id: typeof folder.id === "string" && folder.id ? folder.id : crypto.randomUUID(),
    name: typeof folder.name === "string" ? folder.name.trim().slice(0, 30) : "Folder",
    color: isAllowedFolderColor(folder.color) ? folder.color : FOLDER_COLORS[0],
    icon: folderIconName(folder.icon ?? folder.emoji),
  };
}

function setFolderIcon(parent: HTMLElement, name: FolderIconName): void {
  parent.innerHTML = folderIconSvg(name);
}

function appendFolderBadgeContent(badge: HTMLElement, folder: Folder): void {
  badge.replaceChildren();
  if (folder.icon) {
    const iconWrap = document.createElement("span");
    iconWrap.style.display = "inline-flex";
    iconWrap.style.verticalAlign = "middle";
    iconWrap.style.marginRight = "2px";
    setFolderIcon(iconWrap, folder.icon);
    badge.appendChild(iconWrap);
  }
  badge.appendChild(document.createTextNode(folder.name));
}

const MESSAGE_LIST_ITEM_SELECTOR = "[class*='MessageList__MessageList___'] ol > li[data-message]";

function getMessageListItems(): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(MESSAGE_LIST_ITEM_SELECTOR);
}

function clearMessageListBadges(
  messageItems: NodeListOf<Element>,
  restoreSubjectPlain: (subject: Element) => void,
): void {
  for (const li of messageItems) {
    const subject = li.querySelector("[class*='MessageList__subject___']");
    if (
      subject &&
      (subject.querySelector(".bsplus-msg-badges") || subject.querySelector(".bsplus-subject-text"))
    ) {
      restoreSubjectPlain(subject);
    } else {
      li.querySelector(".bsplus-msg-badges")?.remove();
    }
  }
}

function getAssignedFolderIds(msgId: string, assignments: Record<string, string[]>): string[] {
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

function createFolderBadge(folder: Folder, onFilter: (folderId: string) => void): HTMLElement {
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

type MessageFoldersStorage = {
  folders?: Folder[];
  messageAssignments?: Record<string, string[]>;
};

const messageFoldersPlugin: Pick<Plugin<MessageFoldersSettings, MessageFoldersStorage>, "run"> = {
  run: async (api) => {
    await api.storage.loaded;

    if (!api.storage.folders) api.storage.folders = [];
    if (!api.storage.messageAssignments) api.storage.messageAssignments = {};

    let activeFolderId: string | null = null;
    let messageListObserver: MutationObserver | null = null;
    let observedMessageList: Element | null = null;
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
        ${icon(Inbox, { size: 14, style: "opacity: 0.5" })}
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
        setFolderIcon(iconSpan, folder.icon);
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
          showConfirmModal(
            "Delete folder",
            `Remove "${folder.name}"? Messages won't be deleted.`,
            () => {
              const folders = getFolders().filter((f) => f.id !== folder.id);
              saveFolders(folders);
              const assignments = getAssignments();
              delete assignments[folder.id];
              saveAssignments(assignments);
              if (activeFolderId === folder.id) activeFolderId = null;
              applyFolderFilter();
              applyBadges();
              renderSidebarFolders();
            },
          );
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
          document
            .querySelectorAll(".bsplus-folder-item")
            .forEach((el) => el.classList.remove("bsplus-drag-over"));
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
          const folderId = (e.target as HTMLElement)
            .closest("[data-folder-id]")
            ?.getAttribute("data-folder-id");
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
          document
            .querySelectorAll(".bsplus-folder-item")
            .forEach((el) => el.classList.remove("bsplus-drag-over"));
        });
      });
    };

    const showNewFolderInput = (container: Element, editFolder?: Folder) => {
      const existing = container.querySelector(".bsplus-folder-input");
      if (existing) existing.remove();
      container.querySelector(".bsplus-folder-colors")?.remove();

      let selectedColor =
        editFolder?.color ?? FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];
      let selectedIcon =
        editFolder?.icon ?? FOLDER_ICON_NAMES[Math.floor(Math.random() * FOLDER_ICON_NAMES.length)];

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
      iconBtn.innerHTML = folderIconSvg(selectedIcon);
      iconBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const picker = container.querySelector(".bsplus-icon-picker") as HTMLElement | null;
        if (picker) {
          picker.remove();
          return;
        }
        showIconPicker(container, (name) => {
          selectedIcon = name;
          iconBtn.innerHTML = folderIconSvg(name);
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
          colorRow
            .querySelectorAll(".bsplus-folder-color-opt")
            .forEach((s) =>
              s.classList.toggle(
                "bsplus-color-selected",
                (s as HTMLElement).style.background === color,
              ),
            );
        });
        colorRow.appendChild(swatch);
      }

      const confirm = () => {
        const name = input.value.trim();
        if (!name) return;
        if (editFolder) {
          const folders = getFolders().map((f) =>
            f.id === editFolder.id ? { ...f, name, color: selectedColor, icon: selectedIcon } : f,
          );
          saveFolders(folders);
        } else {
          const folder: Folder = {
            id: crypto.randomUUID(),
            name,
            color: selectedColor,
            icon: selectedIcon,
          };
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

    const showIconPicker = (container: Element, onSelect: (name: FolderIconName) => void) => {
      const existing = container.querySelector(".bsplus-icon-picker");
      if (existing) existing.remove();

      const picker = document.createElement("div");
      picker.className = "bsplus-icon-picker";
      for (const name of FOLDER_ICON_NAMES) {
        const btn = document.createElement("button");
        btn.className = "bsplus-icon-opt";
        btn.setAttribute("aria-label", name);
        btn.innerHTML = folderIconSvg(name);
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(name);
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
          setFolderIcon(iconSpan, folder.icon);

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
            const nowChecked = getAssignedFolderIds(messageId, getAssignments()).includes(
              folder.id,
            );
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
          setFolderIcon(iconSpan, folder.icon);
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
        for (const li of messageItems) {
          li.classList.remove("bsplus-folder-hidden");
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
      if (!messageList || messageList === observedMessageList) return;
      messageListObserver?.disconnect();
      observedMessageList = messageList;
      messageListObserver = new MutationObserver(() => {
        applyBadges();
        applyFolderFilter();
        attachDragListeners();
        attachContextMenuListeners();
      });
      messageListObserver.observe(messageList, { childList: true });
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
      const target =
        document.querySelector("[class*='Viewer__Viewer___']") ??
        document.querySelector("div.messages");
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
          setupMessageListObserver();
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
      document
        .querySelectorAll(".bsplus-folder-hidden")
        .forEach((el) => el.classList.remove("bsplus-folder-hidden"));
      document.querySelectorAll(".bsplus-modal-overlay").forEach((el) => el.remove());
    };
  },
};

export default messageFoldersPlugin;
