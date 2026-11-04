import renderSvelte from "@/interface/main";
import { getAssessmentsData } from "./api";
import { settingsState } from "@/seqta/utils/listeners/settingsState";
import AssessmentsOverview from "./AssessmentsOverview.svelte";
import SkeletonLoader from "./SkeletonLoader.svelte";
import ErrorState from "./ErrorState.svelte";
import { unmount } from "svelte";
import { toMountableComponent } from "@/types/mountableComponent";
import { copyPageTheme, resolvePageAccentColor } from "@/seqta/ui/colors/pageTheme";

let currentApp: ReturnType<typeof renderSvelte> | null = null;
let themeObserver: MutationObserver | null = null;
type ThemeSettingKey =
  | "selectedColor"
  | "DarkMode"
  | "adaptiveThemeColour"
  | "adaptiveThemeGradient"
  | "selectedTheme"
  | "animations";

let themeListeners: Array<{ key: ThemeSettingKey; listener: () => void }> = [];

function syncOverviewTheme(target: HTMLElement) {
  copyPageTheme(target);
  const accent = resolvePageAccentColor();
  target.style.setProperty("--bsplus-overview-accent", accent);
  target.style.setProperty("--better-main", accent);
  target.classList.toggle("bsplus-overview-static", !settingsState.animations);
}

function watchOverviewTheme(root: HTMLElement) {
  for (const { key, listener } of themeListeners) {
    settingsState.unregister(key, listener);
  }
  themeListeners = [];

  const listener = () => syncOverviewTheme(root);
  for (const key of [
    "selectedColor",
    "DarkMode",
    "adaptiveThemeColour",
    "adaptiveThemeGradient",
    "selectedTheme",
    "animations",
  ] satisfies ThemeSettingKey[]) {
    settingsState.register(key, listener);
    themeListeners.push({ key, listener });
  }

  themeObserver?.disconnect();
  themeObserver = new MutationObserver(() => syncOverviewTheme(root));
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style", "class"],
  });
}

function prepareContainer(container: HTMLElement) {
  container.innerHTML = "";
  container.className = "bsplus-overview-host";
  container.classList.add("bsplus-overview-root");
  syncOverviewTheme(container);
  watchOverviewTheme(container);
}

export function renderGrid(
  container: HTMLElement,
  data: Awaited<ReturnType<typeof getAssessmentsData>>,
) {
  if (currentApp) unmount(currentApp);
  prepareContainer(container);
  currentApp = renderSvelte(toMountableComponent(AssessmentsOverview), container, { data });
}

export function renderSkeletonLoader(container: HTMLElement) {
  if (currentApp) unmount(currentApp);
  prepareContainer(container);
  currentApp = renderSvelte(toMountableComponent(SkeletonLoader), container);
}

export function renderLoadingState(container: HTMLElement) {
  renderSkeletonLoader(container);
}

export function renderErrorState(container: HTMLElement, error: string) {
  if (currentApp) unmount(currentApp);
  prepareContainer(container);
  currentApp = renderSvelte(toMountableComponent(ErrorState), container, { error });
}

export function teardownOverviewUi() {
  for (const { key, listener } of themeListeners) {
    settingsState.unregister(key, listener);
  }
  themeListeners = [];
  themeObserver?.disconnect();
  themeObserver = null;
  if (currentApp) {
    unmount(currentApp);
    currentApp = null;
  }
}
