import type { SidebarItem } from "./types";

/** Native SEQTA list only — never the custom Svelte `#bsplus-sidebar-root`. */
export function getNativeMenuList(
  menu: HTMLElement | null = document.getElementById("menu"),
): HTMLElement | null {
  if (!menu) return null;
  return menu.querySelector(
    ":scope > ul:not(#bsplus-sidebar-root)",
  ) as HTMLElement | null;
}

function readLabelText(label: HTMLElement | null): string {
  if (!label) return "";
  const cached = label.dataset.bsplusLabel;
  if (cached) return cached;

  let text = "";
  for (const node of label.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
    } else if (node instanceof HTMLElement && node.tagName !== "SVG") {
      text += node.textContent ?? "";
    }
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized) label.dataset.bsplusLabel = normalized;
  return normalized;
}

function readIconHtml(label: HTMLElement | null): string {
  if (!label) return "";
  const svg = label.querySelector(":scope > svg");
  return svg instanceof SVGElement ? svg.outerHTML : "";
}

const SUBJECT_KEY = /^\d+:\d+$/;

function inferPath(
  rawPath: string | null | undefined,
  key: string,
  parentPath: string | null,
): string | null {
  if (rawPath) return rawPath;
  if (parentPath && SUBJECT_KEY.test(key)) return `${parentPath}/${key}`;
  return null;
}

function parseEntry(
  entry: HTMLElement,
  parentPath: string | null = null,
): SidebarItem | null {
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

  const path = inferPath(entry.dataset.path, key || labelText, parentPath);

  const childList = entry.querySelector(
    ":scope > .sub > ul",
  ) as HTMLElement | null;
  const children = childList
    ? [...childList.children]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map((node) => parseEntry(node, path ?? parentPath))
        .filter((item): item is SidebarItem => item != null)
    : [];

  return {
    key: key || labelText,
    path,
    id: entry.id || null,
    label: labelText,
    iconHtml: readIconHtml(label),
    hasChildren: entry.classList.contains("hasChildren") || children.length > 0,
    itemColour: entry.style.getPropertyValue("--item-colour") || null,
    betterseqta: entry.dataset.betterseqta === "true",
    children,
  };
}

/** True when SEQTA has not filled the Assessments/Courses submenu yet. */
export function folderNeedsNativePopulate(item: SidebarItem): boolean {
  if (item.key !== "assessments" && item.key !== "courses") return false;
  return !item.children.some(
    (child) =>
      !child.betterseqta &&
      child.key !== "upcoming" &&
      child.key !== "assessments-overview",
  );
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

  if (item.path) {
    const byPath = list.querySelector(
      `li[data-path="${CSS.escape(item.path)}"], section[data-path="${CSS.escape(item.path)}"]`,
    );
    if (byPath instanceof HTMLElement) return byPath;
  }

  if (item.key) {
    const matches = [
      ...list.querySelectorAll<HTMLElement>(
        `li[data-key="${CSS.escape(item.key)}"], section[data-key="${CSS.escape(item.key)}"]`,
      ),
    ];
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      if (item.path) {
        const exact = matches.find((node) => node.dataset.path === item.path);
        if (exact) return exact;

        const rootKey = item.path.split("/").filter(Boolean)[0];
        if (rootKey) {
          const underRoot = matches.find((node) =>
            node.closest(`[data-key="${CSS.escape(rootKey)}"]`),
          );
          if (underRoot) return underRoot;
        }
      }

      const leaf = matches.find(
        (node) => !node.classList.contains("hasChildren"),
      );
      if (leaf) return leaf;
      return matches[0];
    }
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
