const MENU_RETURN_CLASS = "bsplus-sidebar-returning";
const LIST_RETURN_CLASS = "bsplus-drill-return-target";
const RETURN_MS = 300;
const RETURN_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Count open folder levels (0 = root list only). */
export function getSidebarDrillDepth(
  menu: HTMLElement | null = document.getElementById("menu"),
): number {
  if (!menu) return 0;

  let depth = 0;
  let list = menu.querySelector(":scope > ul") as HTMLElement | null;

  while (list) {
    const activeFolder = list.querySelector(
      ":scope > li.hasChildren.active, :scope > section.hasChildren.active",
    ) as HTMLElement | null;
    if (!activeFolder) break;

    depth += 1;
    list = activeFolder.querySelector(":scope > .sub > ul") as HTMLElement | null;
  }

  return depth;
}

/** List that becomes visible after drilling back to `targetDepth`. */
function getSidebarListAtDepth(
  menu: HTMLElement,
  targetDepth: number,
): HTMLElement | null {
  if (targetDepth <= 0) {
    return menu.querySelector(":scope > ul") as HTMLElement | null;
  }

  let list = menu.querySelector(":scope > ul") as HTMLElement | null;
  let depth = 0;

  while (list && depth < targetDepth) {
    const activeFolder = list.querySelector(
      ":scope > li.hasChildren.active, :scope > section.hasChildren.active",
    ) as HTMLElement | null;
    if (!activeFolder) return list;
    list = activeFolder.querySelector(":scope > .sub > ul") as HTMLElement | null;
    depth += 1;
  }

  return list;
}

function getSlideOff(menu: HTMLElement): string {
  const value = getComputedStyle(menu).getPropertyValue("--bsplus-slide-off").trim();
  return value || "-320px";
}

function getReturnSlideNodes(list: HTMLElement): HTMLElement[] {
  return [
    ...list.querySelectorAll<HTMLElement>(
      ":scope > li > label, :scope > li > svg, :scope > section > label, :scope > section > svg",
    ),
  ];
}

function clearInlineReturnStyles(nodes: Iterable<HTMLElement>) {
  for (const node of nodes) {
    node.style.removeProperty("transition");
    node.style.removeProperty("transform");
  }
}

let returnTimer: ReturnType<typeof setTimeout> | null = null;
let lastAnimatedNodes: HTMLElement[] = [];
let lastDrillDepth = 0;
let menuObserver: MutationObserver | null = null;
let backCaptureAttached = false;

function clearReturnClasses(menu: HTMLElement) {
  menu.classList.remove(MENU_RETURN_CLASS);
  menu.querySelectorAll(`.${LIST_RETURN_CLASS}`).forEach((node) => {
    node.classList.remove(LIST_RETURN_CLASS);
  });
}

export function runSidebarDrillReturn(
  menu: HTMLElement | null = document.getElementById("menu"),
  targetDepth?: number,
) {
  if (!menu || menu.classList.contains(MENU_RETURN_CLASS)) return;

  const depth = targetDepth ?? Math.max(0, getSidebarDrillDepth(menu));
  const list = getSidebarListAtDepth(menu, depth);
  if (!list) return;

  const nodes = getReturnSlideNodes(list);
  if (nodes.length === 0) return;

  if (returnTimer) clearTimeout(returnTimer);
  clearReturnClasses(menu);
  clearInlineReturnStyles(lastAnimatedNodes);
  lastAnimatedNodes = nodes;

  const slideOff = getSlideOff(menu);

  // Hold the off-screen transform before SEQTA clears `.active` and drops `:has()`.
  for (const node of nodes) {
    node.style.transition = "none";
    node.style.transform = `translateX(${slideOff})`;
  }

  menu.classList.add(MENU_RETURN_CLASS);
  list.classList.add(LIST_RETURN_CLASS);
  lastDrillDepth = depth;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const node of nodes) {
        node.style.transition = `transform ${RETURN_MS}ms ${RETURN_EASE}`;
        node.style.transform = "translateX(0)";
      }
    });
  });

  returnTimer = setTimeout(() => {
    returnTimer = null;
    clearReturnClasses(menu);
    clearInlineReturnStyles(nodes);
    lastAnimatedNodes = [];
  }, RETURN_MS + 50);
}

function onDrillDepthChange(menu: HTMLElement) {
  if (menu.classList.contains(MENU_RETURN_CLASS)) return;

  const depth = getSidebarDrillDepth(menu);
  if (depth < lastDrillDepth) {
    runSidebarDrillReturn(menu, depth);
    return;
  }
  lastDrillDepth = depth;
}

function onMenuClickCapture(event: MouseEvent) {
  const menu = document.getElementById("menu");
  if (!menu || menu.classList.contains(MENU_RETURN_CLASS)) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(".sub .back")) return;

  const depthBefore = getSidebarDrillDepth(menu);
  if (depthBefore > 0) {
    runSidebarDrillReturn(menu, depthBefore - 1);
  }
}

/** Drive the reverse slide when folder `.active` is cleared. */
export function installSidebarDrillReturn(
  menu: HTMLElement | null = document.getElementById("menu"),
) {
  if (!menu || menuObserver) return;

  lastDrillDepth = getSidebarDrillDepth(menu);

  menuObserver = new MutationObserver(() => {
    onDrillDepthChange(menu);
  });
  menuObserver.observe(menu, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  if (!backCaptureAttached) {
    menu.addEventListener("click", onMenuClickCapture, true);
    backCaptureAttached = true;
  }
}

export function uninstallSidebarDrillReturn() {
  menuObserver?.disconnect();
  menuObserver = null;
  if (returnTimer) clearTimeout(returnTimer);
  returnTimer = null;
  lastDrillDepth = 0;

  const menu = document.getElementById("menu");
  if (menu) {
    clearReturnClasses(menu);
    clearInlineReturnStyles(lastAnimatedNodes);
    lastAnimatedNodes = [];
    if (backCaptureAttached) {
      menu.removeEventListener("click", onMenuClickCapture, true);
      backCaptureAttached = false;
    }
  }
  backCaptureAttached = false;
}
