const MENU_RETURN_CLASS = "bsplus-sidebar-returning";
const LIST_RETURN_CLASS = "bsplus-drill-return-target";
const RETURN_MS = 300;
const ROWS_CLASS = "bsplus-drill-rows";

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
    list = activeFolder.querySelector(
      ":scope > .sub > ul",
    ) as HTMLElement | null;
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
    list = activeFolder.querySelector(
      ":scope > .sub > ul",
    ) as HTMLElement | null;
    depth += 1;
  }

  return list;
}

function getReturnSlideNodes(list: HTMLElement): HTMLElement[] {
  return [
    ...list.querySelectorAll<HTMLElement>(":scope > li, :scope > section"),
  ];
}

function prepareRowSlide(list: HTMLElement) {
  // The icons-only root rail remains visible next to the open panel.
  if (
    document.body?.classList.contains("icon-only-sidebar") &&
    list.parentElement?.id === "menu"
  )
    return;
  if (list.classList.contains(ROWS_CLASS)) return;
  const nodes = getReturnSlideNodes(list);
  // Read all auto/preset margins before changing any row's layout.
  const margins = nodes.map((node) => getComputedStyle(node).marginLeft);
  nodes.forEach((node, index) => {
    node.style.setProperty("--bsplus-row-margin-left", margins[index]);
    node.style.setProperty("margin-left", margins[index], "important");
  });
  list.classList.add(ROWS_CLASS);
  // Establish a concrete start before native state changes (or an observer
  // prepares a programmatically opened folder after its class changed).
  void list.offsetWidth;
  nodes.forEach((node) => node.style.removeProperty("margin-left"));
}

function clearRowSlide(nodes: Iterable<HTMLElement>) {
  for (const node of nodes) {
    node.style.removeProperty("margin-left");
    node.style.removeProperty("--bsplus-row-margin-left");
    node.parentElement?.classList.remove(ROWS_CLASS);
  }
}

let returnTimer: ReturnType<typeof setTimeout> | null = null;
let lastDrillDepth = 0;
let menuObserver: MutationObserver | null = null;
let lastRootFolder: Element | null = null;
let swapFrame: number | null = null;

function rootFolder(menu: HTMLElement) {
  return menu.querySelector(
    ":scope > ul > .hasChildren:is(.active, .bsplus-active)",
  );
}

function swapRootPanel(menu: HTMLElement) {
  if (!document.body?.classList.contains("icon-only-sidebar")) return;
  if (swapFrame !== null) cancelAnimationFrame(swapFrame);
  menu.classList.add("bsplus-icon-rail-switching");
  swapFrame = requestAnimationFrame(() => {
    swapFrame = requestAnimationFrame(() => {
      swapFrame = null;
      menu.classList.remove("bsplus-icon-rail-switching");
    });
  });
}
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
  prepareRowSlide(list);

  menu.classList.add(MENU_RETURN_CLASS);
  list.classList.add(LIST_RETURN_CLASS);
  lastDrillDepth = depth;

  returnTimer = setTimeout(() => {
    returnTimer = null;
    clearReturnClasses(menu);
    clearRowSlide(nodes);
  }, RETURN_MS + 50);
}

function onDrillDepthChange(menu: HTMLElement) {
  const currentRoot = rootFolder(menu);
  if (lastRootFolder && currentRoot && lastRootFolder !== currentRoot)
    swapRootPanel(menu);
  lastRootFolder = currentRoot;
  if (menu.classList.contains(MENU_RETURN_CLASS)) return;

  const depth = getSidebarDrillDepth(menu);
  if (depth < lastDrillDepth) {
    runSidebarDrillReturn(menu, depth);
    return;
  }
  if (depth > lastDrillDepth) {
    const outgoing = getSidebarListAtDepth(menu, lastDrillDepth);
    if (outgoing) prepareRowSlide(outgoing);
  }
  lastDrillDepth = depth;
}

function onMenuClickCapture(event: MouseEvent) {
  const menu = document.getElementById("menu");
  if (!menu) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  if (!target.closest(".sub .back")) {
    const folder = target.closest("li.hasChildren, section.hasChildren");
    if (
      folder &&
      !folder.classList.contains("active") &&
      folder.parentElement
    ) {
      if (
        folder.parentElement.parentElement === menu &&
        rootFolder(menu) &&
        rootFolder(menu) !== folder
      )
        swapRootPanel(menu);
      if (returnTimer) clearTimeout(returnTimer);
      returnTimer = null;
      clearReturnClasses(menu);
      prepareRowSlide(folder.parentElement);
    }
    return;
  }

  const depthBefore = getSidebarDrillDepth(menu);
  if (depthBefore > 0) {
    runSidebarDrillReturn(menu, depthBefore - 1);
  }
}

/** Keep row motion together when native folder state changes. */
export function installSidebarDrillReturn(
  menu: HTMLElement | null = document.getElementById("menu"),
) {
  if (!menu || menuObserver) return;

  lastDrillDepth = getSidebarDrillDepth(menu);
  lastRootFolder = rootFolder(menu);
  for (let depth = 0; depth < lastDrillDepth; depth++) {
    const list = getSidebarListAtDepth(menu, depth);
    if (list) prepareRowSlide(list);
  }

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
  lastRootFolder = null;
  if (swapFrame !== null) cancelAnimationFrame(swapFrame);
  swapFrame = null;

  const menu = document.getElementById("menu");
  if (menu) {
    menu.classList.remove("bsplus-icon-rail-switching");
    clearReturnClasses(menu);
    clearRowSlide(
      menu.querySelectorAll<HTMLElement>(
        `ul.${ROWS_CLASS} > li, ul.${ROWS_CLASS} > section`,
      ),
    );
    if (backCaptureAttached) {
      menu.removeEventListener("click", onMenuClickCapture, true);
      backCaptureAttached = false;
    }
  }
  backCaptureAttached = false;
}
