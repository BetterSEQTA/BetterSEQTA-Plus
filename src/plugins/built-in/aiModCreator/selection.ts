const PREFERRED_ATTRIBUTES = ["data-testid", "data-id", "name"] as const;

function isUnique(selector: string, documentRef: Document): boolean {
  try {
    return documentRef.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

function escapeCss(value: string): string {
  const escaped = value.replace(/([^\w-])/g, "\\$1");
  if (/^-?\d/.test(escaped)) {
    const firstDigit = escaped.startsWith("-") ? escaped[1] : escaped[0];
    const prefixLength = escaped.startsWith("-") ? 2 : 1;
    return `${escaped.startsWith("-") ? "-" : ""}\\3${firstDigit} ${escaped.slice(prefixLength)}`;
  }
  return escaped;
}

function elementSegment(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const stableClasses = [...element.classList]
    .filter((className) => /^[A-Za-z_][A-Za-z0-9_-]{0,63}$/.test(className))
    .slice(0, 2);
  let segment = `${tag}${stableClasses
    .map((className) => `.${escapeCss(className)}`)
    .join("")}`;

  const parent = element.parentElement;
  if (parent) {
    const sameTag = [...parent.children].filter(
      (sibling) => sibling.tagName === element.tagName,
    );
    if (sameTag.length > 1) {
      segment += `:nth-of-type(${sameTag.indexOf(element) + 1})`;
    }
  }
  return segment;
}

export function createStableSelector(
  element: Element,
  documentRef: Document = document,
): string {
  if (element.id) {
    const byId = `#${escapeCss(element.id)}`;
    if (isUnique(byId, documentRef)) return byId;
  }

  for (const attribute of PREFERRED_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (!value || value.length > 160) continue;
    const selector = `[${attribute}="${escapeCss(value)}"]`;
    if (isUnique(selector, documentRef)) return selector;
  }

  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== documentRef.documentElement) {
    segments.unshift(elementSegment(current));
    const selector = segments.join(" > ");
    if (isUnique(selector, documentRef)) return selector;
    current = current.parentElement;
  }

  const selector = segments.join(" > ");
  if (!selector || !isUnique(selector, documentRef)) {
    throw new Error("Could not create a stable selector for this element");
  }
  return selector;
}

export function buildScopeRelativeSelector(
  root: HTMLElement,
  target: Element,
): string {
  if (target === root) return ":scope";
  if (!root.contains(target)) {
    throw new Error("Cannot build a selector outside the selected root");
  }
  const segments: string[] = [];
  let current: Element | null = target;
  while (current && current !== root) {
    segments.unshift(elementSegment(current));
    current = current.parentElement;
  }
  return segments.length > 0 ? `:scope > ${segments.join(" > ")}` : ":scope";
}

export interface ElementSelectionOptions {
  onSelect: (element: HTMLElement) => void;
  onCancel: () => void;
  ignoredRoot?: Node | null;
}

function eventElement(event: Event): HTMLElement | null {
  for (const item of event.composedPath()) {
    if (item instanceof HTMLElement) return item;
  }
  return event.target instanceof HTMLElement ? event.target : null;
}

export function startElementSelection({
  onSelect,
  onCancel,
  ignoredRoot,
}: ElementSelectionOptions): () => void {
  const overlay = document.createElement("div");
  overlay.dataset.bsplusAiSelectionOverlay = "";
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    border: "2px solid var(--better-main, #8b5cf6)",
    borderRadius: "6px",
    background: "color-mix(in srgb, var(--better-main, #8b5cf6) 14%, transparent)",
    boxShadow: "0 0 0 1px rgba(255,255,255,.7)",
    display: "none",
    transition: "left 60ms, top 60ms, width 60ms, height 60ms",
  });
  document.body.appendChild(overlay);

  let active = true;
  const isIgnored = (element: HTMLElement) =>
    element === overlay ||
    ignoredRoot === element ||
    Boolean(ignoredRoot?.contains(element)) ||
    Boolean(
      ignoredRoot instanceof HTMLElement &&
        ignoredRoot.shadowRoot?.contains(element),
    );

  const updateOverlay = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };

  const cleanup = () => {
    if (!active) return;
    active = false;
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
  };

  const onPointerMove = (event: PointerEvent) => {
    const element = eventElement(event);
    if (!element || isIgnored(element)) {
      overlay.style.display = "none";
      return;
    }
    updateOverlay(element);
  };

  const onClick = (event: MouseEvent) => {
    const element = eventElement(event);
    if (!element || isIgnored(element)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    cleanup();
    onSelect(element);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    cleanup();
    onCancel();
  };

  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
  return cleanup;
}
