export type CustomMenuActiveState = {
  activeKey: string | null;
  drilling: boolean;
};

function ensureActive(el: Element | null | undefined, withBsplus = false) {
  if (!(el instanceof HTMLElement)) return;
  if (!el.classList.contains("active")) el.classList.add("active");
  if (withBsplus && !el.classList.contains("bsplus-active")) {
    el.classList.add("bsplus-active");
  }
}

/**
 * SEQTA strips `.active` (and sometimes our `.bsplus-active`) after navigation.
 * Theme chrome, `.sub` hit-testing, and icon-only expand all depend on those classes.
 */
export function applyCustomMenuActive(state: CustomMenuActiveState) {
  const root = document.getElementById("bsplus-sidebar-root");
  if (!root) return;

  for (const li of root.querySelectorAll("li.hasChildren")) {
    if (!(li instanceof HTMLElement)) continue;
    if (!li.querySelector(":scope > .sub")) continue;
    ensureActive(li, true);
  }

  const { activeKey, drilling } = state;

  if (drilling) {
    if (activeKey) {
      ensureActive(
        root.querySelector(`.sub li.item[data-key="${CSS.escape(activeKey)}"]`),
        true,
      );
    }
    for (const li of root.querySelectorAll(
      '.sub li.item[aria-current="page"]',
    )) {
      ensureActive(li, true);
    }
    return;
  }

  if (activeKey) {
    ensureActive(
      root.querySelector(`li.item[data-key="${CSS.escape(activeKey)}"]`),
      true,
    );
  }

  for (const li of root.querySelectorAll('li.item[aria-current="page"]')) {
    ensureActive(li, true);
  }
}

let restoreTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Restore after SEQTA's click/hash handlers have finished rewriting `#menu` classes.
 * One rAF is not enough on assessments — SEQTA often strips `.active` a frame later.
 */
export function scheduleRestoreCustomMenuActive(state: CustomMenuActiveState) {
  requestAnimationFrame(() => {
    applyCustomMenuActive(state);
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      restoreTimer = null;
      applyCustomMenuActive(state);
    }, 50);
  });
}
