/**
 * Teach chrome helpers: page-list / subpage active-state sync.
 */

export function normalizeTeachPath(path: string): string {
  const trimmed = path.split("?")[0].split("#")[0] || "/";
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed || "/";
}

/** Whether a page-list/subpage href should show as active for the current path. */
export function pathMatchesTeachNavHref(
  pathname: string,
  href: string,
): boolean {
  if (!href || href === "#" || href.startsWith("javascript:")) {
    return false;
  }

  let linkPath: string;
  try {
    linkPath = normalizeTeachPath(new URL(href, "https://local.invalid").pathname);
  } catch {
    return false;
  }

  const current = normalizeTeachPath(pathname);

  if (linkPath.includes("betterseqta-home")) {
    return current.includes("betterseqta-home");
  }

  if (linkPath === "/") {
    return current === "/" || current === "";
  }

  return current === linkPath || current.startsWith(`${linkPath}/`);
}

function setLinkActive(link: HTMLAnchorElement, active: boolean): void {
  link.classList.toggle("active", active);
  if (active) {
    link.setAttribute("aria-current", "page");
  } else {
    link.removeAttribute("aria-current");
  }
}

/** Which Spine workspace should highlight for the current path. */
export function resolveTeachSpineWorkspace(
  pathname: string,
): "home" | "teaching" | "pastoral" | "portal" | "admin" | "myed" | null {
  const path = normalizeTeachPath(pathname).toLowerCase();

  if (
    path.includes("betterseqta-home") ||
    path.startsWith("/welcome") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/help") ||
    path.startsWith("/notices") ||
    path.startsWith("/messages")
  ) {
    return "home";
  }
  if (
    path.startsWith("/studentsummary") ||
    path.startsWith("/healthcentre") ||
    path.startsWith("/studentgoals") ||
    path.startsWith("/studentplans") ||
    path.startsWith("/counterbullying")
  ) {
    return "pastoral";
  }
  if (path.startsWith("/portal")) {
    return "portal";
  }
  if (path.startsWith("/myedonline")) {
    return "myed";
  }
  if (
    path.startsWith("/academic") ||
    path.startsWith("/attendance") ||
    path.startsWith("/folios") ||
    path.startsWith("/forum") ||
    path.startsWith("/marksbook") ||
    path.startsWith("/programme")
  ) {
    return "admin";
  }
  if (path.startsWith("/timetable")) {
    return "teaching";
  }
  return null;
}

function spineHrefWorkspace(
  href: string,
): "home" | "teaching" | "pastoral" | "portal" | "admin" | "myed" | null {
  const path = normalizeTeachPath(href).toLowerCase();
  if (path === "/welcome" || path === "/") return "home";
  if (path.startsWith("/timetable")) return "teaching";
  if (path.startsWith("/studentsummary")) return "pastoral";
  if (path.startsWith("/portal")) return "portal";
  if (path.startsWith("/academic")) return "admin";
  if (path.startsWith("/myedonline")) return "myed";
  return null;
}

/** Highlight the active Spine workspace icon. */
export function syncTeachSpineActiveStates(
  pathname: string = window.location.pathname,
): void {
  const workspace = resolveTeachSpineWorkspace(pathname);
  const spine = document.querySelector("[class*='Spine__Spine']");
  if (!spine || !workspace) return;

  spine.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    if (link.dataset.betterseqta) return;
    const href = link.getAttribute("href") || "";
    const linkWorkspace = spineHrefWorkspace(href);
    if (!linkWorkspace) return;
    setLinkActive(link, linkWorkspace === workspace);
  });

  // BetterSEQTA home spine button
  const homeBtn = document.getElementById(
    "betterseqta-teach-homebutton",
  ) as HTMLAnchorElement | null;
  if (homeBtn) {
    setLinkActive(homeBtn, workspace === "home" || pathname.includes("betterseqta-home"));
  }
}

/** Mark matching page-list and subpage links as active. */
export function syncTeachNavActiveStates(
  pathname: string = window.location.pathname,
): void {
  const selectors = [
    "[class*='PageList__pageContainer'] a[href]",
    "[class*='PageList__PageList'] a[href]",
    "[class*='SubpageList__SubpageList'] a[href]",
    "#betterseqta-teach-pagelist-home",
  ];

  const links = document.querySelectorAll<HTMLAnchorElement>(
    selectors.join(", "),
  );

  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    setLinkActive(link, pathMatchesTeachNavHref(pathname, href));
  });

  syncTeachSpineActiveStates(pathname);
}
