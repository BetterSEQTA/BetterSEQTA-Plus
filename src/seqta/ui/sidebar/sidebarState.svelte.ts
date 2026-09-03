import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { animationsEnabled } from "@/seqta/utils/performanceMode";
import {
  applyCustomMenuActive,
  scheduleRestoreCustomMenuActive,
} from "./customMenuActive";
import {
  findNativeMenuEntry,
  folderNeedsNativePopulate,
  getNativeMenuList,
  getPagePathFromHash,
  parseNativeMenu,
} from "./parseNativeMenu";
import type { SidebarDrillFrame, SidebarItem } from "./types";

export const BSPLUS_DRILL_MS = 350;

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

function resetSidebarScroll() {
  const root = document.getElementById("bsplus-sidebar-root");
  if (root instanceof HTMLElement) root.scrollTop = 0;
}

function customMenuActiveState() {
  return {
    activeKey: sidebarState.activeKey,
    drilling: sidebarState.isDrilling,
  };
}

/**
 * SEQTA strips `.active` from menu items after navigation. Restore the custom list
 * state so the active subject/folder still matches the route and theme chrome.
 */
export function restoreCustomMenuActive() {
  applyCustomMenuActive(customMenuActiveState());
}

function scheduleRestoreAfterSeqta() {
  scheduleRestoreCustomMenuActive(customMenuActiveState());
}

/** Clear native drill state so it cannot steal pointer-events from the custom list. */
export function clearNativeDrillActive(menu: HTMLElement) {
  getNativeMenuList(menu)
    ?.querySelectorAll("li.hasChildren.active, section.hasChildren.active")
    .forEach((node) => node.classList.remove("active"));
}

export function findItemByPath(
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

function findItemByKeyInList(
  items: SidebarItem[],
  key: string,
): SidebarItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children.length) {
      const nested = findItemByKeyInList(item.children, key);
      if (nested) return nested;
    }
  }
  return null;
}

function menuTreeEqual(a: SidebarItem[], b: SidebarItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (
      left.key !== right.key ||
      left.path !== right.path ||
      left.label !== right.label ||
      left.iconHtml !== right.iconHtml ||
      left.hasChildren !== right.hasChildren ||
      left.itemColour !== right.itemColour ||
      left.betterseqta !== right.betterseqta ||
      left.id !== right.id ||
      !menuTreeEqual(left.children, right.children)
    ) {
      return false;
    }
  }
  return true;
}

function drillStackEqual(
  a: SidebarDrillFrame[],
  b: SidebarDrillFrame[],
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (
      left.key !== right.key ||
      left.label !== right.label ||
      left.items.length !== right.items.length ||
      left.items.some((item, j) => item.key !== right.items[j]?.key)
    ) {
      return false;
    }
  }
  return true;
}

class SidebarState {
  items = $state.raw<SidebarItem[]>([]);
  drillStack = $state.raw<SidebarDrillFrame[]>([]);
  activeKey = $state<string | null>(null);
  activePath = $state("");
  editMode = $state(false);
  iconOnly = $state(false);
  /** Folder key playing the one-shot panel enter animation. */
  enterFrameKey = $state<string | null>(null);
  drillReturning = $state(false);

  visibleRootItems = $derived(
    filterVisible(orderItems(this.items, settingsState.menuorder ?? [])),
  );

  /** Full ordered root list for edit mode (includes hidden items). */
  editRootItems = $derived(
    orderItems(this.items, settingsState.menuorder ?? []),
  );

  isDrilling = $derived(this.drillStack.length > 0);

  compact = $derived(this.iconOnly && !this.isDrilling && !this.editMode);

  syncFromNative(menu: HTMLElement) {
    const next = parseNativeMenu(menu);
    if (!menuTreeEqual(this.items, next)) {
      this.items = next;
    }
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
      const parent = findItemByPath(this.items, `/${segments.join("/")}`);
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
      if (!folder?.hasChildren) {
        next.push(...this.drillStack.slice(next.length));
        break;
      }
      const children = filterVisible(folder.children);
      next.push({ key: folder.key, label: folder.label, items: children });
      cursor = children;
    }

    if (!drillStackEqual(this.drillStack, next)) {
      this.drillStack = next;
    }
  }

  openFolder(item: SidebarItem, menu?: HTMLElement) {
    if (!item.hasChildren || this.drillReturning) return;
    if (this.drillStack.at(-1)?.key === item.key) return;

    this.drillReturning = false;

    const frame: SidebarDrillFrame = {
      key: item.key,
      label: item.label,
      items: filterVisible(item.children),
    };
    const isRoot = this.visibleRootItems.some(
      (entry) => entry.key === item.key,
    );

    this.drillStack = isRoot ? [frame] : [...this.drillStack, frame];
    this.enterFrameKey = item.key;

    if (!animationsEnabled()) {
      queueMicrotask(() => this.clearEnterFrame(item.key));
    }

    // Keep native drill closed so SEQTA CSS :has(> ul > li.hasChildren.active)
    // does not lock pointer-events on the custom list.
    if (menu) {
      if (folderNeedsNativePopulate(item)) {
        const native = findNativeMenuEntry(menu, item);
        native?.click();
      }
      clearNativeDrillActive(menu);
    }

    // Absolute `.sub` panels live inside the scrollport — jump to top so the
    // drilled page isn't left under the logo when the list was scrolled down.
    resetSidebarScroll();
    scheduleRestoreAfterSeqta();
  }

  clearEnterFrame(key?: string) {
    if (key == null || this.enterFrameKey === key) {
      this.enterFrameKey = null;
    }
  }

  goBack() {
    if (!this.drillStack.length || this.drillReturning) return;

    this.enterFrameKey = null;
    this.drillStack = this.drillStack.slice(0, -1);
    resetSidebarScroll();

    if (!animationsEnabled()) return;

    this.drillReturning = true;
    window.setTimeout(() => {
      this.drillReturning = false;
    }, BSPLUS_DRILL_MS + 20);
  }

  resetDrill() {
    this.enterFrameKey = null;
    this.drillReturning = false;
    this.drillStack = [];
    resetSidebarScroll();
  }

  setEditMode(enabled: boolean) {
    this.editMode = enabled;
    if (enabled) this.resetDrill();
  }

  applyMenuOrder(keys: string[]) {
    if (!keys.length) return;
    settingsState.menuorder = [...keys];
  }

  reorderRoot(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const keys = this.editRootItems.map((item) => item.key);
    const from = keys.indexOf(fromKey);
    const to = keys.indexOf(toKey);
    if (from < 0 || to < 0) return;

    const next = [...keys];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    this.applyMenuOrder(next);
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
    if (this.editMode || this.drillReturning) return;

    if (item.hasChildren) {
      this.openFolder(item, menu);
      return;
    }

    this.activeKey = item.key;
    if (item.path) this.activePath = item.path;

    // Already inside this folder — never replay the one-shot enter animation when
    // SEQTA rewrites `.active` on the route change.
    if (this.isDrilling) {
      this.enterFrameKey = null;
    }

    const native = findNativeMenuEntry(menu, item);
    if (native) {
      native.click();
      scheduleRestoreAfterSeqta();
      return;
    }

    if (item.path) {
      location.hash = `?page=${item.path}`;
      scheduleRestoreAfterSeqta();
    }
  }

  findByKey(key: string) {
    for (let i = this.drillStack.length - 1; i >= 0; i--) {
      const hit = this.drillStack[i].items.find((item) => item.key === key);
      if (hit) return hit;
    }
    return findItemByKeyInList(this.items, key);
  }

  findByPath(path: string) {
    return findItemByPath(this.items, path);
  }

  resolveItem(key: string | undefined, path: string | undefined) {
    if (path) {
      const byPath = this.findByPath(path);
      if (byPath) return byPath;
    }
    if (key) return this.findByKey(key);
    return null;
  }
}

export const sidebarState = new SidebarState();
