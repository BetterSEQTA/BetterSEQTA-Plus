import { settingsState } from "@/seqta/utils/listeners/SettingsState";

/** Insert a menu DOM node after the top-level item with `afterKey`. */
export function insertMenuItemAfterKey(
  menuList: HTMLElement,
  item: HTMLElement,
  afterKey: string,
): void {
  const after = menuList.querySelector(
    `:scope > li[data-key="${afterKey}"], :scope > section[data-key="${afterKey}"]`,
  );
  if (after instanceof HTMLElement) {
    after.insertAdjacentElement("afterend", item);
  } else {
    menuList.appendChild(item);
  }
}

export function insertKeyAfterInOrder(
  order: string[],
  key: string,
  afterKey: string,
): string[] {
  if (order.includes(key)) return order;
  const copy = [...order];
  const afterIdx = copy.indexOf(afterKey);
  if (afterIdx >= 0) {
    copy.splice(afterIdx + 1, 0, key);
  } else {
    copy.push(key);
  }
  return copy;
}

/** Default Analytics immediately below Courses in saved menu order. */
export function ensureAnalyticsMenuOrder(): void {
  for (const key of ["defaultmenuorder", "menuorder"] as const) {
    const order = settingsState[key];
    if (key === "menuorder" && order.length === 0) continue;
    if (!order.includes("analytics")) {
      settingsState[key] = insertKeyAfterInOrder(order, "analytics", "courses");
    }
  }
}
