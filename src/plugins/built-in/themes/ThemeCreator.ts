import renderSvelte from "@/interface/main";
import themeCreator from "@/interface/pages/themeCreator.svelte";
import { unmount } from "svelte";
import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";

let themeCreatorSvelteApp: any = null;
const themeManager = ThemeManager.getInstance();

/**
 * Open the Theme Creator sidebar, it is an embedded page loaded similar to the extension popup
 * @param themeID - The ID of the theme to load in the Theme Creator
 * @returns void
 */
export function OpenThemeCreator(themeID: string = "") {
  CloseThemeCreator();

  // Only store original color if we're not editing an existing theme
  localStorage.setItem("themeCreatorOpen", "true");
  if (!themeID) {
    localStorage.setItem("originalPreviewColor", settingsState.selectedColor);
  }

  const width = "310px";

  const themeCreatorDiv: HTMLDivElement = document.createElement("div");
  themeCreatorDiv.id = "themeCreator";
  themeCreatorDiv.style.width = width;

  const shadow = themeCreatorDiv.attachShadow({ mode: "open" });
  themeCreatorSvelteApp = renderSvelte(themeCreator, shadow, {
    themeID: themeID,
  });

  const mainContent = document.querySelector("#container") as HTMLDivElement;
  if (mainContent) mainContent.style.width = `calc(100% - ${width})`;

  // close button
  const closeButton = document.createElement("button");
  closeButton.classList.add("themeCloseButton");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", () => {
    CloseThemeCreator();
    themeManager.clearPreview();
  });

  document.body.appendChild(closeButton);

  const resizeBar = document.createElement("div");
  resizeBar.classList.add("resizeBar");
  resizeBar.style.right = "307.5px";

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
    const newWidth = Math.max(310, windowWidth - e.clientX);
    themeCreatorDiv.style.width = `${newWidth}px`;
    mainContent.style.width = `calc(100% - ${newWidth}px)`;
    resizeBar.style.right = `${newWidth - 2.5}px`;
  };

  const mouseUpHandler = () => {
    isDragging = false;
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
    document.body.style.userSelect = "";
    themeCreatorDiv.style.pointerEvents = "auto";
  };

  resizeBar.addEventListener("mousedown", mouseDownHandler);
  resizeBar.addEventListener(
    "mouseover",
    () => (resizeBar.style.opacity = "1"),
  );
  resizeBar.addEventListener("mouseout", () => (resizeBar.style.opacity = "0"));

  document.body.appendChild(themeCreatorDiv);
  document.body.appendChild(resizeBar);
}

/**
 * Close the Theme Creator sidebar
 * @returns void
 */
export function CloseThemeCreator() {
  // Remove the stored flag
  localStorage.removeItem("themeCreatorOpen");

  const themeCreator = document.getElementById("themeCreator");
  const closeButton = document.querySelector(
    ".themeCloseButton",
  ) as HTMLButtonElement;
  const resizeBar = document.querySelector(".resizeBar") as HTMLDivElement;

  if (themeCreatorSvelteApp) unmount(themeCreatorSvelteApp);
  if (themeCreator) themeCreator.remove();
  if (closeButton) closeButton.remove();
  if (resizeBar) resizeBar.remove();

  const mainContent = document.querySelector("#container") as HTMLDivElement;
  if (mainContent) mainContent.style.width = "100%";
}
