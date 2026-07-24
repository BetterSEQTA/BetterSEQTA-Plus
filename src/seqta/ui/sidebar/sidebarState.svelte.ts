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

function ensureActive(el: Element | null | undefined) {
  if (el instanceof HTMLElement && !el.classList.contains("active")) {
    el.classList.add("active");
  }
}

function resetSidebarScroll() {
  const root = document.getElementById("bsplus-sidebar-root");
  if (!(root instanceof HTMLElement)) return;
  root.scrollTop = 0;
  requestAnimationFrame(() => {
    root.scrollTop = 0;
  });
}

/**
 * SEQTA (and some themes) strip `.active` from `#menu li` after navigation.
 * Theme decorations and drill `.sub` chrome depend on that class on our list.
 *
 * While drilling, never re-apply route-active on root leaves — themes like Beach
 * paint palm/sand on `#menu > ul > li:not(.hasChildren).active`, and our `.sub`
 * is transparent so those decorations show through over folder contents.
 */
export function restoreCustomMenuActive() {
  const root = document.getElementById("bsplus-sidebar-root");
  if (!root) return;

  for (const li of root.querySelectorAll("li.hasChildren")) {
    if (!(li instanceof HTMLElement)) continue;
    if (!li.querySelector(":scope > .sub")) continue;
    ensureActive(li);
  }

  const activeKey = sidebarState.activeKey;
  const drilling = sidebarState.isDrilling;

  if (drilling) {
    if (activeKey) {
      ensureActive(
        root.querySelector(`.sub li.item[data-key="${CSS.escape(activeKey)}"]`),
      );
    }
    for (const li of root.querySelectorAll(
      '.sub li.item[aria-current="page"]',
    )) {
      ensureActive(li);
    }
    return;
  }

  if (activeKey) {
    ensureActive(
      root.querySelector(`li.item[data-key="${CSS.escape(activeKey)}"]`),
    );
  }

  for (const li of root.querySelectorAll('li.item[aria-current="page"]')) {
    ensureActive(li);
  }
}

/** Clear native drill state so it cannot steal pointer-events from the custom list. */
export function clearNativeDrillActive(menu: HTMLElement) {
  getNativeMenuList(menu)
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
  /** Frame key whose `.sub` should play the one-shot enter animation. */
  enterFrameKey = $state<string | null>(null);

  visibleRootItems = $derived(
    filterVisible(orderItems(this.items, settingsState.menuorder ?? [])),
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
      if (!folder?.hasChildren) break;
      const children = filterVisible(folder.children);
      next.push({ key: folder.key, label: folder.label, items: children });
      cursor = children;
    }

    if (!drillStackEqual(this.drillStack, next)) {
      this.drillStack = next;
    }
  }

  openFolder(item: SidebarItem, menu?: HTMLElement) {
    if (!item.hasChildren) return;
    // Ignore duplicate opens (double-firing click / label + li).
    if (this.drillStack.at(-1)?.key === item.key) return;

    const frame: SidebarDrillFrame = {
      key: item.key,
      label: item.label,
      items: filterVisible(item.children),
    };
    const isRoot = this.visibleRootItems.some((entry) => entry.key === item.key);

    this.enterFrameKey = item.key;
    // Root folders replace the stack; nested folders append.
    this.drillStack = isRoot ? [frame] : [...this.drillStack, frame];

    // Keep native drill closed so SEQTA CSS :has(> ul > li.hasChildren.active)
    // does not lock pointer-events on the custom list.
    if (menu) clearNativeDrillActive(menu);

    // Absolute `.sub` panels live inside the scrollport — jump to top so the
    // drilled page isn't left under the logo when the list was scrolled down.
    resetSidebarScroll();
  }

  clearEnterFrame(key?: string) {
    if (key == null || this.enterFrameKey === key) {
      this.enterFrameKey = null;
    }
  }

  goBack() {
    if (!this.drillStack.length) return;
    this.enterFrameKey = null;
    this.drillStack = this.drillStack.slice(0, -1);
    resetSidebarScroll();
  }

  resetDrill() {
    this.enterFrameKey = null;
    this.drillStack = [];
    resetSidebarScroll();
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
      this.openFolder(item, menu);
      return;
    }

    this.activeKey = item.key;
    if (item.path) this.activePath = item.path;

    const native = findNativeMenuEntry(menu, item);
    if (native) {
      // Clear native drill once only — repeating clearNativeDrillActive fights
      // SEQTA (it re-adds .active) and used to freeze the tab via menu sync.
      clearNativeDrillActive(menu);
      native.click();
      clearNativeDrillActive(menu);
      restoreCustomMenuActive();
      requestAnimationFrame(() => {
        clearNativeDrillActive(menu);
        restoreCustomMenuActive();
      });
      // Later pass restores custom `.active` only (no native clear loop).
      setTimeout(() => restoreCustomMenuActive(), 50);
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
