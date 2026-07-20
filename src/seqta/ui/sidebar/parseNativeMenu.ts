import type { SidebarItem } from "./types";

/** Native SEQTA list only — never the custom Svelte `#bsplus-sidebar-root`. */
export function getNativeMenuList(menu: HTMLElement): HTMLElement | null {
  return (
    (menu.querySelector(
      ":scope > ul:not(#bsplus-sidebar-root)",
    ) as HTMLElement | null) ?? null
  );
}

function readLabelText(label: HTMLElement | null): string {
  if (!label) return "";
  const clone = label.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("svg").forEach((svg) => svg.remove());
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

function readIconHtml(label: HTMLElement | null): string {
  if (!label) return "";
  const svg = label.querySelector(":scope > svg");
  return svg instanceof SVGElement ? svg.outerHTML : "";
}

function parseEntry(entry: HTMLElement): SidebarItem | null {
  if (!entry.matches("li.item, section.item, li, section")) return null;

  const label = entry.querySelector(":scope > label") as HTMLElement | null;
  const labelText = readLabelText(label);
  let key =
    entry.dataset.key ??
    entry.id ??
    labelText.toLowerCase().replace(/\s+/g, "-") ??
    "";

  // Stable key for BS+ Overview injection (no data-key on the native node).
  if (
    !entry.dataset.key &&
    entry.classList.contains("betterseqta-assessments-overview-item")
  ) {
    key = "assessments-overview";
  }

  if (!key && !labelText) return null;

  const childList = entry.querySelector(
    ":scope > .sub > ul",
  ) as HTMLElement | null;
  const children = childList
    ? [...childList.children]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map(parseEntry)
        .filter((item): item is SidebarItem => item != null)
    : [];

  return {
    key: key || labelText,
    path: entry.dataset.path ?? null,
    id: entry.id || null,
    label: labelText,
    iconHtml: readIconHtml(label),
    hasChildren: entry.classList.contains("hasChildren") || children.length > 0,
    colour: entry.getAttribute("data-colour"),
    itemColour: entry.style.getPropertyValue("--item-colour") || null,
    betterseqta: entry.dataset.betterseqta === "true",
    children,
  };
}

/** Parse the native SEQTA `#menu` list into a plain tree for the Svelte sidebar. */
export function parseNativeMenu(menu: HTMLElement): SidebarItem[] {
  const list = getNativeMenuList(menu);
  if (!list) return [];

  return [...list.children]
    .filter((node): node is HTMLElement => node instanceof HTMLElement)
    .map(parseEntry)
    .filter((item): item is SidebarItem => item != null);
}

export function findNativeMenuEntry(
  menu: HTMLElement,
  item: Pick<SidebarItem, "key" | "id" | "path" | "label">,
): HTMLElement | null {
  const list = getNativeMenuList(menu);
  if (!list) return null;

  if (item.key === "assessments-overview") {
    const overview = list.querySelector(
      ".betterseqta-assessments-overview-item",
    );
    if (overview instanceof HTMLElement) return overview;
  }

  if (item.id) {
    const byId = list.querySelector(`#${CSS.escape(item.id)}`);
    if (byId instanceof HTMLElement) return byId;
  }

  if (item.key) {
    const byKey = list.querySelector(
      `li[data-key="${CSS.escape(item.key)}"], section[data-key="${CSS.escape(item.key)}"]`,
    );
    if (byKey instanceof HTMLElement) return byKey;
  }

  if (item.path) {
    const byPath = list.querySelector(
      `li[data-path="${CSS.escape(item.path)}"], section[data-path="${CSS.escape(item.path)}"]`,
    );
    if (byPath instanceof HTMLElement) return byPath;
  }

  if (item.label) {
    const candidates = list.querySelectorAll<HTMLElement>(
      "li.item, section.item",
    );
    for (const candidate of candidates) {
      const label = candidate.querySelector(":scope > label");
      if (
        label instanceof HTMLElement &&
        readLabelText(label) === item.label
      ) {
        return candidate;
      }
    }
  }

  return null;
}

export function getPagePathFromHash(hash = location.hash): string {
  const match = hash.match(/[?&]page=([^&]*)/);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
