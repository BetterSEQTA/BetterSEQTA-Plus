import type { PluginAPI } from "@/plugins/core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";

export const ANIMATED_BG_MARKER = "bsplus-animated-bg";

const LAYER_CLASSES = [
  ["bg", ANIMATED_BG_MARKER],
  ["bg", "bg2", ANIMATED_BG_MARKER],
  ["bg", "bg3", ANIMATED_BG_MARKER],
] as const;

const bgSel = `.bg.${ANIMATED_BG_MARKER}`;
const scopeSel = `:scope > div${bgSel}`;
const BASE_SPEEDS = [3, 4, 5] as const;

export function updateAnimationSpeed(speed: number) {
  document.querySelectorAll(bgSel).forEach((element, index) => {
    const base = BASE_SPEEDS[index] ?? BASE_SPEEDS[2];
    (element as HTMLElement).style.animationDuration = `${base / speed}s`;
  });
}

export function ensureAnimatedBackgroundLayers(
  container: HTMLElement,
  menu: HTMLElement,
  speed: number,
): void {
  if (container.querySelectorAll(scopeSel).length >= 3) {
    updateAnimationSpeed(speed);
    return;
  }

  container.querySelectorAll(scopeSel).forEach((el) => el.remove());

  for (const classes of LAYER_CLASSES) {
    const bk = document.createElement("div");
    classes.forEach((cls) => bk.classList.add(cls));
    container.insertBefore(bk, menu);
  }

  updateAnimationSpeed(speed);
}

export function removeAnimatedBackgroundLayers(): void {
  document.querySelectorAll(`div${bgSel}`).forEach((el) => el.remove());
}

export async function syncAnimatedBackground(
  api: PluginAPI<{ speed: number }>,
): Promise<void> {
  try {
    const [container, menu] = await Promise.all([
      waitForElm("#container", true),
      waitForElm("#menu", true),
    ]);
    ensureAnimatedBackgroundLayers(
      container as HTMLElement,
      menu as HTMLElement,
      api.settings.speed,
    );
  } catch {
    // #container / #menu not ready yet
  }
}
