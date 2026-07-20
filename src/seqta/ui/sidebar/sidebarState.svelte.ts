import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  findNativeMenuEntry,
  getNativeMenuList,
  getPagePathFromHash,
  parseNativeMenu,
} from "./parseNativeMenu";
import type { SidebarDrillFrame, SidebarItem } from "./types";

function orderItems(items: SidebarItem[], order: string[]): SidebarItem[] {
  if (!order.length) return items;

  const byKey = new Map(items.map((item) => [item.key, item]));
  const seen = new Set<string>();
  const ordered: SidebarItem[] = [];

  for (const key of order) {
    const item = byKey.get(key);
    if (!item) continue;
    ordered.push(item);
    seen.add(key);
  }

  for (const item of items) {
    if (!seen.has(item.key)) ordered.push(item);
  }

  return ordered;
}

function filterVisible(items: SidebarItem[]): SidebarItem[] {
  const menuItems = settingsState.menuitems as Record<
    string,
    { toggle?: boolean } | undefined
  >;

  return items.filter((item) => menuItems[item.key]?.toggle !== false);
}

/**
 * SEQTA (and some themes) strip `.active` from `#menu li` after navigation.
 * Theme decorations (e.g. beach palm/sand) and drill `.sub` chrome all depend
 * on that class staying on our custom list — re-apply it from known state.
 */
export function restoreCustomMenuActive() {
  const root = document.getElementById("bsplus-sidebar-root");
  if (!root) return;

  // Open drill folders (must keep `.active` for `.sub` layout + theme selectors).
  for (const li of root.querySelectorAll("li.hasChildren")) {
    if (!(li instanceof HTMLElement)) continue;
    if (!li.querySelector(":scope > .sub")) continue;
    if (!li.classList.contains("active")) li.classList.add("active");
  }

  // Route-active row — Svelte sets aria-current, but SEQTA often removes `.active`.
  const activeKey = sidebarState.activeKey;
  if (activeKey) {
    const activeLi = root.querySelector(
      `li.item[data-key="${CSS.escape(activeKey)}"]`,
    );
    if (
      activeLi instanceof HTMLElement &&
      !activeLi.classList.contains("active")
    ) {
      activeLi.classList.add("active");
    }
  }

  for (const li of root.querySelectorAll('li.item[aria-current="page"]')) {
    if (li instanceof HTMLElement && !li.classList.contains("active")) {
      li.classList.add("active");
    }
  }
}

/** @deprecated Use restoreCustomMenuActive */
export const restoreCustomDrillActive = restoreCustomMenuActive;

/** Clear native drill state so it cannot steal pointer-events from the custom list. */
export function clearNativeDrillActive(menu: HTMLElement) {
  const nativeList = getNativeMenuList(menu);
  nativeList
    ?.querySelectorAll("li.hasChildren.active, section.hasChildren.active")
    .forEach((node) => node.classList.remove("active"));
}

function findItemByPath(
  items: SidebarItem[],
  path: string,
): SidebarItem | null {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children.length) {
      const nested = findItemByPath(item.children, path);
      if (nested) return nested;
    }
  }
  return null;
}

function findItemByKey(
  items: SidebarItem[],
  key: string,
): SidebarItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children.length) {
      const nested = findItemByKey(item.children, key);
      if (nested) return nested;
    }
  }
  return null;
}

class SidebarState {
  items = $state.raw<SidebarItem[]>([]);
  drillStack = $state.raw<SidebarDrillFrame[]>([]);
  activeKey = $state<string | null>(null);
  activePath = $state("");
  editMode = $state(false);
  iconOnly = $state(false);
  ready = $state(false);

  visibleRootItems = $derived(
    filterVisible(orderItems(this.items, settingsState.menuorder ?? [])),
  );

  currentItems = $derived(
    this.drillStack.length > 0
      ? this.drillStack[this.drillStack.length - 1].items
      : this.visibleRootItems,
  );

  currentTitle = $derived(
    this.drillStack.length > 0
      ? this.drillStack[this.drillStack.length - 1].label
      : null,
  );

  isDrilling = $derived(this.drillStack.length > 0);

  compact = $derived(this.iconOnly && !this.isDrilling && !this.editMode);

  syncFromNative(menu: HTMLElement) {
    this.items = parseNativeMenu(menu);
    this.ready = this.items.length > 0;
    this.syncActiveFromLocation();
    this.pruneDrillStack();
  }

  syncSettings() {
    this.iconOnly = settingsState.iconOnlySidebar === true;
  }

  syncActiveFromLocation() {
    const path = getPagePathFromHash();
    this.activePath = path;

    if (!path) {
      this.activeKey = null;
      return;
    }

    const exact = findItemByPath(this.items, path);
    if (exact) {
      this.activeKey = exact.key;
      return;
    }

    // Nested routes like /assessments/upcoming → assessments
    const segments = path.split("/").filter(Boolean);
    while (segments.length > 1) {
      segments.pop();
      const parentPath = `/${segments.join("/")}`;
      const parent = findItemByPath(this.items, parentPath);
      if (parent) {
        this.activeKey = parent.key;
        return;
      }
    }

    this.activeKey = null;
  }

  pruneDrillStack() {
    if (!this.drillStack.length) return;

    const next: SidebarDrillFrame[] = [];
    let cursor = this.visibleRootItems;

    for (const frame of this.drillStack) {
      const folder = cursor.find((item) => item.key === frame.key);
      if (!folder?.hasChildren) break;
      const children = filterVisible(folder.children);
      next.push({ key: folder.key, label: folder.label, items: children });
      cursor = children;
    }

    this.drillStack = next;
  }

  openFolder(item: SidebarItem) {
    if (!item.hasChildren) return;
    this.drillStack = [
      ...this.drillStack,
      {
        key: item.key,
        label: item.label,
        items: filterVisible(item.children),
      },
    ];
  }

  goBack() {
    if (!this.drillStack.length) return;
    this.drillStack = this.drillStack.slice(0, -1);
  }

  resetDrill() {
    this.drillStack = [];
  }

  setEditMode(enabled: boolean) {
    this.editMode = enabled;
    if (enabled) this.resetDrill();
  }

  reorderRoot(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const keys = this.visibleRootItems.map((item) => item.key);
    const from = keys.indexOf(fromKey);
    const to = keys.indexOf(toKey);
    if (from < 0 || to < 0) return;

    const next = [...keys];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    settingsState.menuorder = next;
  }

  setItemVisibility(key: string, visible: boolean) {
    const current = {
      ...(settingsState.menuitems as Record<string, { toggle: boolean }>),
    };
    current[key] = { toggle: visible };
    settingsState.menuitems = current as typeof settingsState.menuitems;
  }

  restoreDefaultOrder() {
    const defaults = settingsState.defaultmenuorder;
    if (defaults?.length) {
      settingsState.menuorder = [...defaults];
    }

    const restored: Record<string, { toggle: boolean }> = {};
    for (const item of this.items) {
      restored[item.key] = { toggle: true };
    }
    settingsState.menuitems = restored as typeof settingsState.menuitems;
  }

  activateItem(item: SidebarItem, menu: HTMLElement) {
    if (this.editMode) return;

    if (item.hasChildren) {
      this.openFolder(item);
      return;
    }

    this.activeKey = item.key;
    if (item.path) this.activePath = item.path;

    const native = findNativeMenuEntry(menu, item);
    if (native) {
      // Never strip `.active` from custom `#bsplus-sidebar-root` folders.
      clearNativeDrillActive(menu);
      native.click();
      // SEQTA re-opens native drill and strips `.active` after click — undo both.
      clearNativeDrillActive(menu);
      restoreCustomMenuActive();
      requestAnimationFrame(() => {
        clearNativeDrillActive(menu);
        restoreCustomMenuActive();
      });
      setTimeout(() => {
        clearNativeDrillActive(menu);
        restoreCustomMenuActive();
      }, 0);
      setTimeout(() => {
        clearNativeDrillActive(menu);
        restoreCustomMenuActive();
      }, 50);
      setTimeout(() => {
        clearNativeDrillActive(menu);
        restoreCustomMenuActive();
      }, 100);
      return;
    }

    if (item.path) {
      location.hash = `?page=${item.path}`;
    }
  }

  findByKey(key: string) {
    return findItemByKey(this.items, key);
  }
}

export const sidebarState = new SidebarState();
