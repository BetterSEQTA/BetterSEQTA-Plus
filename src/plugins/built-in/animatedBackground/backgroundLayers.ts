import type { PluginAPI } from "@/plugins/core/types";
import { isSeqtaTeachExperience } from "@/seqta/utils/isSeqtaTeach";
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

function insertBackgroundLayers(
  container: HTMLElement,
  insertBefore: HTMLElement | null,
  speed: number,
): void {
  const existing = container.querySelectorAll(
    isSeqtaTeachExperience() ? `.bg.${ANIMATED_BG_MARKER}` : scopeSel,
  );
  if (existing.length >= 3) {
    updateAnimationSpeed(speed);
    return;
  }

  existing.forEach((el) => el.remove());

  for (const classes of LAYER_CLASSES) {
    const bk = document.createElement("div");
    classes.forEach((cls) => bk.classList.add(cls));
    if (insertBefore && insertBefore.parentElement === container) {
      container.insertBefore(bk, insertBefore);
    } else {
      container.insertBefore(bk, container.firstChild);
    }
  }

  updateAnimationSpeed(speed);
}

export function ensureAnimatedBackgroundLayers(
  container: HTMLElement,
  menu: HTMLElement,
  speed: number,
): void {
  insertBackgroundLayers(container, menu, speed);
}

export function removeAnimatedBackgroundLayers(): void {
  document.querySelectorAll(`div${bgSel}`).forEach((el) => el.remove());
}

export async function syncAnimatedBackground(
  api: PluginAPI<{ speed: number }>,
): Promise<void> {
  try {
    if (isSeqtaTeachExperience()) {
      const container =
        document.getElementById("root") ||
        ((await waitForElm("#root", true)) as HTMLElement);
      const spine = document.querySelector("[class*='Spine__Spine']");
      const insertBefore =
        (spine as HTMLElement) ||
        (container.firstElementChild as HTMLElement);
      insertBackgroundLayers(container, insertBefore, api.settings.speed);
      return;
    }

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
    // #container / #menu / #root not ready yet
  }
}
