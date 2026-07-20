import type { Plugin } from "@/plugins/core/types";
import { BasePlugin } from "@/plugins/core/settings";
import {
  booleanSetting,
  defineSettings,
  Setting,
} from "@/plugins/core/settingsHelpers";

const settings = defineSettings({
  autoScrollOnClick: booleanSetting({
    default: false,
    title: "Auto-scroll navigator on click",
    description:
      "When you click a lesson directly in the side panel, automatically scroll it to the centre. The prev/next arrows always centre the selected lesson regardless of this setting.",
  }),
});

class EnhancedNavigationSettings extends BasePlugin<typeof settings> {
  @Setting(settings.autoScrollOnClick)
  autoScrollOnClick!: boolean;
}

const settingsInstance = new EnhancedNavigationSettings();

const ARROW_CONTAINER_ID = "betterseqta-en-arrows";
const STYLE_ID = "betterseqta-en-styles";

const injectStyles = () => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ARROW_CONTAINER_ID} {
      position: fixed;
      right: 24px;
      display: flex;
      gap: 6px;
      z-index: 15;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }
    body:has(.outside-container:not(.hide)) #${ARROW_CONTAINER_ID},
    body:has(.bsplus-notifications-panel:not(.hide)) #${ARROW_CONTAINER_ID} {
      opacity: 0;
      pointer-events: none;
    }
    body:has(.outside-container:not(.hide)) #${ARROW_CONTAINER_ID} .en-arrow,
    body:has(.bsplus-notifications-panel:not(.hide)) #${ARROW_CONTAINER_ID} .en-arrow {
      pointer-events: none;
    }
    #${ARROW_CONTAINER_ID} .en-arrow {
      pointer-events: auto;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.08);
      color: #000;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.1s ease;
      padding: 0;
    }
    #${ARROW_CONTAINER_ID} .en-arrow:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.18);
    }
    #${ARROW_CONTAINER_ID} .en-arrow:active:not(:disabled) {
      transform: scale(0.92);
    }
    #${ARROW_CONTAINER_ID} .en-arrow:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    html.dark #${ARROW_CONTAINER_ID} .en-arrow {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    html.dark #${ARROW_CONTAINER_ID} .en-arrow:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.18);
    }
    #${ARROW_CONTAINER_ID} .en-arrow svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      display: block;
    }
  `;
  document.head.appendChild(style);
};

const getOrderedItems = (navigator: Element): HTMLElement[] => {
  const items: HTMLElement[] = [];
  const cover = navigator.querySelector<HTMLElement>("li.cover");
  if (cover) items.push(cover);
  const lessons = Array.from(
    navigator.querySelectorAll<HTMLElement>("li.lesson"),
  );
  lessons.sort((a, b) => {
    const wa = parseInt(a.dataset.week ?? "0", 10);
    const wb = parseInt(b.dataset.week ?? "0", 10);
    if (wa !== wb) return wa - wb;
    const na = parseInt(a.dataset.number ?? "0", 10);
    const nb = parseInt(b.dataset.number ?? "0", 10);
    return na - nb;
  });
  items.push(...lessons);
  return items;
};

const getSelected = (navigator: Element): HTMLElement | null =>
  navigator.querySelector<HTMLElement>("li.selected");

const findScrollableAncestor = (el: Element | null): HTMLElement | null => {
  let cur: HTMLElement | null = el as HTMLElement | null;
  while (cur && cur !== document.body) {
    const style = getComputedStyle(cur);
    const oy = style.overflowY;
    if (
      (oy === "auto" || oy === "scroll" || oy === "overlay") &&
      cur.scrollHeight > cur.clientHeight + 1
    ) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
};

const scrollSelectedIntoView = (navigator: Element) => {
  const selected = getSelected(navigator);
  if (!selected) return;

  const scroller =
    findScrollableAncestor(selected) ?? (navigator as HTMLElement);
  if (!scroller) return;

  const scrollerRect = scroller.getBoundingClientRect();
  const selectedRect = selected.getBoundingClientRect();
  const offset =
    selectedRect.top -
    scrollerRect.top -
    scroller.clientHeight / 2 +
    selectedRect.height / 2;

  scroller.scrollTop = Math.max(
    0,
    Math.min(
      scroller.scrollTop + offset,
      scroller.scrollHeight - scroller.clientHeight,
    ),
  );
};

const positionArrows = () => {
  const container = document.getElementById(ARROW_CONTAINER_ID);
  if (!container) return;
  const ref =
    document.getElementById("toolbar") ??
    document.querySelector<HTMLElement>(".course");
  if (!ref) return;
  const rect = ref.getBoundingClientRect();
  const arrowH = container.offsetHeight || 32;
  const verticalOffset = 4;
  container.style.top = `${Math.max(0, rect.top + (rect.height - arrowH) / 2 + verticalOffset)}px`;
};

let scrollOnNextSelect = false;

const navigate = (course: HTMLElement, direction: "prev" | "next") => {
  const nav = course.querySelector(".navigator");
  if (!nav) return;
  const items = getOrderedItems(nav);
  const selected = getSelected(nav);
  const idx = selected ? items.indexOf(selected) : -1;
  const target = idx + (direction === "next" ? 1 : -1);
  if (target < 0 || target >= items.length) return;
  scrollOnNextSelect = true;
  items[target].click();
};

const updateArrowState = (course: HTMLElement) => {
  const nav = course.querySelector(".navigator");
  const container = document.getElementById(ARROW_CONTAINER_ID);
  if (!nav || !container) return;

  const items = getOrderedItems(nav);
  const selected = getSelected(nav);
  const idx = selected ? items.indexOf(selected) : -1;

  const prev = container.querySelector<HTMLButtonElement>(
    'button[data-en-action="prev"]',
  );
  const next = container.querySelector<HTMLButtonElement>(
    'button[data-en-action="next"]',
  );
  if (prev) prev.disabled = idx <= 0;
  if (next) next.disabled = idx === -1 || idx >= items.length - 1;
};

const ensureArrows = (course: HTMLElement) => {
  if (!course.querySelector(".programmeNavigator")) return;

  let container = document.getElementById(ARROW_CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = ARROW_CONTAINER_ID;
    container.innerHTML = `
      <button type="button" class="en-arrow" data-en-action="prev" title="Previous lesson" aria-label="Previous lesson">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
      </button>
      <button type="button" class="en-arrow" data-en-action="next" title="Next lesson" aria-label="Next lesson">
        <svg viewBox="0 0 24 24"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
      </button>
    `;
    document.body.appendChild(container);

    container.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btn = (e.target as Element).closest<HTMLButtonElement>(
        "button[data-en-action]",
      );
      if (!btn) return;
      const liveCourse = document.querySelector<HTMLElement>(".course");
      if (liveCourse)
        navigate(liveCourse, btn.dataset.enAction as "prev" | "next");
    });
  }

  positionArrows();
  updateArrowState(course);
};

const watchNavigator = (navigator: Element, onChange: () => void) => {
  onChange();
  const observer = new MutationObserver((muts) => {
    if (
      muts.some(
        (m) =>
          (m.type === "attributes" && m.attributeName === "class") ||
          m.type === "childList",
      )
    ) {
      onChange();
    }
  });
  observer.observe(navigator, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
  });
  return observer;
};

const handleSlidePane = (pane: Element): (() => void) => {
  const navigator = pane.querySelector(".navigator");
  if (!navigator) return () => {};

  requestAnimationFrame(() => scrollSelectedIntoView(navigator));
  setTimeout(() => scrollSelectedIntoView(navigator), 50);

  const observer = new MutationObserver(() =>
    scrollSelectedIntoView(navigator),
  );
  observer.observe(navigator, {
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
  });

  const paneCleanup = new MutationObserver((muts) => {
    muts.forEach((m) => {
      m.removedNodes.forEach((n) => {
        if (n === pane) {
          observer.disconnect();
          paneCleanup.disconnect();
        }
      });
    });
  });
  paneCleanup.observe(document.body, { childList: true });

  return () => {
    observer.disconnect();
    paneCleanup.disconnect();
  };
};

const enhancedNavigationPlugin: Plugin<typeof settings> = {
  id: "enhanced-navigation",
  name: "Enhanced Navigation",
  description:
    "Keeps the course navigator focused on the current lesson and adds prev/next lesson arrows.",
  version: "1.0.0",
  disableToggle: true,
  settings: settingsInstance.settings,
  beta: false,

  run: async (api) => {
    injectStyles();

    window.addEventListener("resize", positionArrows);

    const navObservers: MutationObserver[] = [];
    const courseObservers: MutationObserver[] = [];
    const slidePaneCleanups: Array<() => void> = [];

    const courseMount = api.seqta.onMount(".course", async (element) => {
      const course = element as HTMLElement;
      let navObserver: MutationObserver | null = null;

      const setup = () => {
        const nav = course.querySelector(".navigator");
        if (!nav) return false;
        if (navObserver) return true;

        ensureArrows(course);
        navObserver = watchNavigator(nav, () => {
          if (scrollOnNextSelect || api.settings.autoScrollOnClick) {
            scrollSelectedIntoView(nav);
            scrollOnNextSelect = false;
          }
          ensureArrows(course);
        });
        navObservers.push(navObserver);
        return true;
      };

      if (!setup()) {
        const courseObserver = new MutationObserver(() => {
          if (setup()) courseObserver.disconnect();
        });
        courseObservers.push(courseObserver);
        courseObserver.observe(course, { childList: true, subtree: true });
      }
    });

    const bodyObserver = new MutationObserver((muts) => {
      muts.forEach((m) => {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as Element;
          if (el.classList?.contains("uiSlidePane")) {
            slidePaneCleanups.push(handleSlidePane(el));
          }
        });
      });
    });
    bodyObserver.observe(document.body, { childList: true });

    return () => {
      window.removeEventListener("resize", positionArrows);
      courseMount.unregister();
      navObservers.forEach((observer) => observer.disconnect());
      courseObservers.forEach((observer) => observer.disconnect());
      slidePaneCleanups.forEach((cleanup) => cleanup());
      bodyObserver.disconnect();
      document.getElementById(ARROW_CONTAINER_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    };
  },
};

export default enhancedNavigationPlugin;
