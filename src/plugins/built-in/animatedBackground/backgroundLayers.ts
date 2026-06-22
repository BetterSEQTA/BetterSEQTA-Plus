import type { PluginAPI } from "@/plugins/core/types";
import { waitForElm } from "@/seqta/utils/waitForElm";

export const ANIMATED_BG_MARKER = "bsplus-animated-bg";

const LAYER_CLASSES = [
  ["bg", ANIMATED_BG_MARKER],
  ["bg", "bg2", ANIMATED_BG_MARKER],
  ["bg", "bg3", ANIMATED_BG_MARKER],
] as const;

export function updateAnimationSpeed(speed: number) {
  const bgElements = document.querySelectorAll(`.bg.${ANIMATED_BG_MARKER}`);
  Array.from(bgElements).forEach((element, index) => {
    const baseSpeed = index === 0 ? 3 : index === 1 ? 4 : 5;
    (element as HTMLElement).style.animationDuration = `${baseSpeed / speed}s`;
  });
}

function countAnimatedLayers(container: HTMLElement): number {
  return container.querySelectorAll(`:scope > div.bg.${ANIMATED_BG_MARKER}`).length;
}

export function ensureAnimatedBackgroundLayers(
  container: HTMLElement,
  menu: HTMLElement,
  speed: number,
): void {
  const count = countAnimatedLayers(container);
  if (count >= 3) {
    updateAnimationSpeed(speed);
    return;
  }

  container
    .querySelectorAll(`:scope > div.bg.${ANIMATED_BG_MARKER}`)
    .forEach((el) => el.remove());

  for (const classes of LAYER_CLASSES) {
    const bk = document.createElement("div");
    classes.forEach((cls) => bk.classList.add(cls));
    container.insertBefore(bk, menu);
  }

  updateAnimationSpeed(speed);
}

export function removeAnimatedBackgroundLayers(): void {
  document
    .querySelectorAll(`div.bg.${ANIMATED_BG_MARKER}`)
    .forEach((el) => el.remove());
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
