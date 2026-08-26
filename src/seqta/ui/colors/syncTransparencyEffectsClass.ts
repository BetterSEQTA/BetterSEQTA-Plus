export function syncTransparencyEffectsClass(
  enabled: boolean,
  root: HTMLElement = document.documentElement,
): void {
  if (enabled) {
    root.classList.add("transparencyEffects");
  } else {
    root.classList.remove("transparencyEffects");
  }
}
