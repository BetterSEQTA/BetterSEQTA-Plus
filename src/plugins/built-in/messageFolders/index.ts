import type { Plugin } from "../../core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";
import styles from "./styles.css?inline";

interface Folder {
  id: string;
  name: string;
  color: string;
}

interface MessageFoldersStorage {
  folders: Folder[];
  messageAssignments: Record<string, string[]>;
}

const FOLDER_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const FOLDER_ICON_SVG = `<svg style="width:24px;height:24px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>`;
const PLUS_SVG = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
const CHECK_SVG_DARK = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const CHECK_SVG_WHITE = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#fff" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const CLOSE_SVG = `<svg style="width:14px;height:14px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;
const EDIT_SVG = `<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
const TRASH_SVG = `<svg style="width:12px;height:12px;flex-shrink:0" viewBox="0 0 24 24"><path fill="#888" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const messageFoldersPlugin: Plugin<{}, MessageFoldersStorage> = {
  id: "messageFolders",
  name: "Message Folders",
  description: "Organize direct messages into custom folders",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  defaultEnabled: true,

  run: async (api) => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

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

    // ── Storage accessors ──

    const getFolders = (): Folder[] => api.storage.folders ?? [];
    const getAssignments = (): Record<string, string[]> => api.storage.messageAssignments ?? {};

    const saveFolders = (folders: Folder[]) => {
      api.storage.folders = [...folders];
    };

    const saveAssignments = (assignments: Record<string, string[]>) => {
      api.storage.messageAssignments = { ...assignments };
    };

    const getMessageFolderIds = (messageId: string): string[] => {
      const assignments = getAssignments();
      const ids: string[] = [];
      for (const [folderId, msgIds] of Object.entries(assignments)) {
        if (msgIds.includes(messageId)) ids.push(folderId);
      }
      return ids;
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

    // ── Confirm modal ──

    const showConfirmModal = (
      title: string,
      message: string,
      onConfirm: () => void,
    ) => {
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

    // ── Sidebar folder UI ──

    const renderSidebarFolders = () => {
      const sidebar = document.querySelector("[class*='Viewer__sidebar___']");
      if (!sidebar) return;

      const ol = sidebar.querySelector("ol");
      if (!ol) return;

      let section = ol.querySelector(".bsplus-folders-section");
      if (!section) {
        section = document.createElement("div");
        section.className = "bsplus-folders-section";
        ol.appendChild(section);
      }

      const folders = getFolders();
      const existingInput = section.querySelector(".bsplus-folder-input");
      const existingColors = section.querySelector(".bsplus-folder-colors");

      section.innerHTML = "";

      // Header
      const header = document.createElement("div");
      header.className = "bsplus-folders-header";

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

      // "All Messages" item
      const allItem = document.createElement("div");
      allItem.className = `bsplus-folder-item${activeFolderId === null ? " bsplus-folder-active" : ""}`;
      allItem.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" style="fill: currentcolor; opacity: 0.5; flex-shrink: 0;"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        <span class="bsplus-folder-name">All Messages</span>
      `;
      allItem.addEventListener("click", () => {
        activeFolderId = null;
        applyFolderFilter();
        renderSidebarFolders();
      });
      section.appendChild(allItem);

      // Folder items
      for (const folder of folders) {
        const item = document.createElement("div");
        item.className = `bsplus-folder-item${activeFolderId === folder.id ? " bsplus-folder-active" : ""}`;
        item.dataset.folderId = folder.id;

        const dot = document.createElement("div");
        dot.className = "bsplus-folder-dot";
        dot.style.background = folder.color;
        item.appendChild(dot);

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
          showEditFolderInput(section!, folder);
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
          renderSidebarFolders();
        });

        section.appendChild(item);
      }

      // Restore input if it was open
      if (existingInput || existingColors) {
        // Don't restore – let user re-trigger
      }
    };

    const showNewFolderInput = (container: Element, editFolder?: Folder) => {
      const existing = container.querySelector(".bsplus-folder-input");
      if (existing) existing.remove();
      container.querySelector(".bsplus-folder-colors")?.remove();

      let selectedColor = editFolder?.color ?? FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];

      const row = document.createElement("div");
      row.className = "bsplus-folder-input";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = editFolder ? "Rename folder…" : "Folder name…";
      input.value = editFolder?.name ?? "";
      input.maxLength = 30;

      const confirmBtn = document.createElement("button");
      confirmBtn.className = "bsplus-folder-input-confirm";
      confirmBtn.innerHTML = CHECK_SVG_WHITE;

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "bsplus-folder-input-cancel";
      cancelBtn.innerHTML = CLOSE_SVG;

      row.appendChild(input);
      row.appendChild(confirmBtn);
      row.appendChild(cancelBtn);

      // Color picker
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
            f.id === editFolder.id ? { ...f, name, color: selectedColor } : f,
          );
          saveFolders(folders);
        } else {
          const folder: Folder = { id: generateId(), name, color: selectedColor };
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

    const showEditFolderInput = (container: Element, folder: Folder) => {
      showNewFolderInput(container, folder);
    };

    // ── Intercept native sidebar clicks to clear folder filter ──

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
            renderSidebarFolders();
          }
        }
      });
    };

    // ── "Add to folder" button in message action bar ──

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
        closeDropdown();

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

    const showFolderDropdown = (anchor: HTMLElement, messageId: string) => {
      const dropdown = document.createElement("div");
      dropdown.className = "bsplus-folder-dropdown";

      const folders = getFolders();
      const currentFolderIds = getMessageFolderIds(messageId);

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

          const check = document.createElement("div");
          check.className = "bsplus-folder-dropdown-check";
          check.style.borderColor = isChecked ? folder.color : "";
          check.style.background = isChecked ? folder.color : "";
          check.innerHTML = CHECK_SVG_WHITE;

          const dot = document.createElement("div");
          dot.className = "bsplus-folder-dot";
          dot.style.background = folder.color;

          const name = document.createElement("span");
          name.textContent = folder.name;

          item.appendChild(check);
          item.appendChild(dot);
          item.appendChild(name);

          item.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleMessageInFolder(messageId, folder.id);

            const nowChecked = getMessageFolderIds(messageId).includes(folder.id);
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

    // ── Message badges ──

    const applyBadges = () => {
      const folders = getFolders();
      const assignments = getAssignments();
      const messageItems = document.querySelectorAll("[class*='MessageList__MessageList___'] ol > li[data-message]");

      for (const li of messageItems) {
        const msgId = li.getAttribute("data-message");
        if (!msgId) continue;

        let badgeContainer = li.querySelector(".bsplus-msg-badges") as HTMLElement | null;

        const folderIds = [];
        for (const [fId, mIds] of Object.entries(assignments)) {
          if (mIds.includes(msgId)) folderIds.push(fId);
        }

        if (folderIds.length === 0) {
          badgeContainer?.remove();
          continue;
        }

        if (!badgeContainer) {
          badgeContainer = document.createElement("div");
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
        }

        badgeContainer.innerHTML = "";
        for (const fId of folderIds) {
          const folder = folders.find((f) => f.id === fId);
          if (!folder) continue;
          const badge = document.createElement("span");
          badge.className = "bsplus-msg-badge";
          badge.style.background = folder.color;
          badge.textContent = folder.name;
          badge.title = `Filter by "${folder.name}"`;
          badge.addEventListener("click", (e) => {
            e.stopPropagation();
            activeFolderId = folder.id;
            applyFolderFilter();
            renderSidebarFolders();
          });
          badgeContainer.appendChild(badge);
        }
      }
    };

    // ── Folder filtering ──

    const applyFolderFilter = () => {
      const messageItems = document.querySelectorAll("[class*='MessageList__MessageList___'] ol > li[data-message]");
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

    // ── Observers ──

    const setupMessageListObserver = () => {
      const messageList = document.querySelector("[class*='MessageList__MessageList___'] ol");
      if (!messageList || messageListObserver) return;

      messageListObserver = new MutationObserver(() => {
        applyBadges();
        applyFolderFilter();
      });
      messageListObserver.observe(messageList, { childList: true, subtree: false });
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

    // ── Main page handler ──

    const handleMessagesPage = async () => {
      await waitForElm("[class*='Viewer__sidebar___'] ol", true, 50, 100);

      renderSidebarFolders();
      attachNativeSidebarListeners();

      await waitForElm("[class*='MessageList__MessageList___'] ol", true, 50, 100);
      applyBadges();
      applyFolderFilter();
      setupMessageListObserver();

      // The actions bar only exists when a message is selected/open,
      // so we observe the whole viewer for it to appear dynamically
      setupActionsObserver();

      // If a message is already selected, inject immediately
      const actionsBar = document.querySelector("[class*='Message__actions___']");
      if (actionsBar) injectFolderButton(actionsBar);

      // Re-observe the sidebar for SEQTA re-renders
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

    // ── Lifecycle ──

    const mountUnsub = api.seqta.onMount("div.messages", handleMessagesPage);
    unregisters.push(mountUnsub);

    return () => {
      for (const u of unregisters) u.unregister();
      messageListObserver?.disconnect();
      sidebarObserver?.disconnect();
      actionsObserver?.disconnect();
      closeDropdown();
      styleEl.remove();
      document.querySelectorAll(".bsplus-folders-section").forEach((el) => el.remove());
      document.querySelectorAll(".bsplus-folder-btn").forEach((el) => el.remove());
      document.querySelectorAll(".bsplus-msg-badges").forEach((el) => el.remove());
      document.querySelectorAll(".bsplus-folder-hidden").forEach((el) =>
        el.classList.remove("bsplus-folder-hidden"),
      );
      document.querySelectorAll(".bsplus-modal-overlay").forEach((el) => el.remove());
    };
  },
};

export default messageFoldersPlugin;
