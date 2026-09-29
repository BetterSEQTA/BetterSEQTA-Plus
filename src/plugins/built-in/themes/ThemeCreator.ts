import { unmount } from "svelte";
import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { themeBuilderPanel } from "@/interface/hooks/themeBuilderPanel.svelte";
import {
  clearThemeCreatorSession,
  persistThemeCreatorSession,
} from "@/plugins/built-in/themes/themeCreatorPersistence";
import {
  applyThemeCreatorLayout,
  clearThemeCreatorLayout,
} from "@/plugins/built-in/themes/themeCreatorLayout";

let themeCreatorSvelteApp: any = null;
let currentWidthPx = 400;

/**
 * Open the interactive theme builder docked to the right of the SEQTA page (not inside settings).
 */
export async function OpenThemeCreator(themeID: string = "") {
  await CloseThemeCreator();

  themeBuilderPanel.open(themeID || null);
  persistThemeCreatorSession(themeID || null);

  ThemeManager.getInstance().beginThemeCreatorSession();

  const [{ default: renderSvelte }, { default: ThemeCreatorPage }] = await Promise.all([
    import("@/interface/main"),
    import("@/interface/pages/themeCreator.svelte"),
  ]);

  const editingId = themeID || themeBuilderPanel.editingThemeId || "";

  currentWidthPx = 460;
  const width = `${currentWidthPx}px`;

  const themeCreatorDiv: HTMLDivElement = document.createElement("div");
  themeCreatorDiv.id = "themeCreator";
  themeCreatorDiv.style.width = width;
  themeCreatorDiv.style.height = "100%";

  if (settingsState.DarkMode) {
    themeCreatorDiv.classList.add("dark");
  }

  const shadow = themeCreatorDiv.attachShadow({ mode: "open" });
  themeCreatorSvelteApp = renderSvelte(ThemeCreatorPage, shadow, {
    themeID: editingId,
  });

  applyThemeCreatorLayout(currentWidthPx);
  themeCreatorDiv.style.color = "initial";

  const resizeBar = document.createElement("div");
  resizeBar.classList.add("resizeBar");

  let isDragging = false;

  const mouseDownHandler = (_: MouseEvent) => {
    isDragging = true;
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.body.style.userSelect = "none";
    themeCreatorDiv.style.pointerEvents = "none";
  };

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragging) return;
    const windowWidth = window.innerWidth;
    currentWidthPx = Math.max(320, windowWidth - e.clientX);
    themeCreatorDiv.style.width = `${currentWidthPx}px`;
    applyThemeCreatorLayout(currentWidthPx);
    positionResizeBar(currentWidthPx, resizeBar);
  };

  const mouseUpHandler = () => {
    isDragging = false;
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
    document.body.style.userSelect = "";
    themeCreatorDiv.style.pointerEvents = "auto";
  };

  resizeBar.addEventListener("mousedown", mouseDownHandler);
  resizeBar.addEventListener("mouseover", () => (resizeBar.style.opacity = "1"));
  resizeBar.addEventListener("mouseout", () => (resizeBar.style.opacity = "0"));

  document.body.appendChild(themeCreatorDiv);
  document.body.appendChild(resizeBar);
  positionResizeBar(currentWidthPx, resizeBar);
}

function positionResizeBar(widthPx: number, resizeBar: HTMLDivElement) {
  resizeBar.style.right = `${widthPx - 2.5}px`;
}

export async function CloseThemeCreator(options?: { restoreTheme?: boolean }) {
  const themeManager = ThemeManager.getInstance();
  if (options?.restoreTheme === false) {
    themeManager.discardThemeCreatorRestore();
    themeManager.clearPreview();
  } else {
    await themeManager.endThemeCreatorSession();
  }
  clearThemeCreatorSession();
  themeBuilderPanel.close();

  const themeCreator = document.getElementById("themeCreator");
  const resizeBar = document.querySelector(".resizeBar") as HTMLDivElement | null;

  if (themeCreatorSvelteApp) unmount(themeCreatorSvelteApp);
  themeCreatorSvelteApp = null;
  if (themeCreator) themeCreator.remove();
  if (resizeBar) resizeBar.remove();

  clearThemeCreatorLayout();
}

export function isThemeCreatorOpen(): boolean {
  return document.getElementById("themeCreator") != null;
}
