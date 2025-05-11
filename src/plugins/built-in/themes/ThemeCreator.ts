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
  CloseThemeCreator(); // Close any existing instance first

  // Set localStorage flag indicating the creator is open
  localStorage.setItem("themeCreatorOpen", "true");

  // Store the original color if not editing an existing theme
  if (!themeID) {
    localStorage.setItem("originalPreviewColor", settingsState.selectedColor);
  }

  const width = "310px"; // Default sidebar width

  // Create the container div for the Theme Creator
  const themeCreatorDiv: HTMLDivElement = document.createElement("div");
  themeCreatorDiv.id = "themeCreator";
  themeCreatorDiv.style.width = width;

  // Attach shadow DOM for style encapsulation and render the Svelte component
  const shadow = themeCreatorDiv.attachShadow({ mode: "open" });
  themeCreatorSvelteApp = renderSvelte(themeCreator, shadow, {
    themeID: themeID,
  });

  // Resize the main content area to accommodate the sidebar
  const mainContent = document.querySelector("#container") as HTMLDivElement;
  if (mainContent) mainContent.style.width = `calc(100% - ${width})`;

  // Create and configure the close button
  const closeButton = document.createElement("button");
  closeButton.classList.add("themeCloseButton");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", () => {
    CloseThemeCreator();
    themeManager.clearPreview(); // Clear preview on close
  });

  document.body.appendChild(closeButton); // Add close button to the DOM

  // Create and configure the draggable resize bar
  const resizeBar = document.createElement("div");
  resizeBar.classList.add("resizeBar");
  resizeBar.style.right = "307.5px"; // Initial position relative to sidebar width

  let isDragging = false; // Flag to indicate drag state

  // Handle start of resize drag
  const mouseDownHandler = (_: MouseEvent) => {
    isDragging = true;
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
    document.body.style.userSelect = "none"; // Prevent text selection
    themeCreatorDiv.style.pointerEvents = "none"; // Disable pointer events during resize
  };

  // Handle sidebar width adjustment during drag
  const mouseMoveHandler = (e: MouseEvent) => {
    if (!isDragging) return;
    const windowWidth = window.innerWidth;
    const newWidth = Math.max(310, windowWidth - e.clientX); // Minimum width is 310px
    themeCreatorDiv.style.width = `${newWidth}px`;
    mainContent.style.width = `calc(100% - ${newWidth}px)`;
    resizeBar.style.right = `${newWidth - 2.5}px`; // Adjust resize bar position
  };

  // Handle end of resize drag
  const mouseUpHandler = () => {
    isDragging = false;
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
    document.body.style.userSelect = ""; // Restore text selection
    themeCreatorDiv.style.pointerEvents = "auto"; // Re-enable pointer events
  };

  // Bind event handlers for resizing
  resizeBar.addEventListener("mousedown", mouseDownHandler);
  resizeBar.addEventListener(
    "mouseover",
    () => (resizeBar.style.opacity = "1"),
  );
  resizeBar.addEventListener("mouseout", () => (resizeBar.style.opacity = "0"));

  // Add the theme creator sidebar and resize bar to the DOM
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

  // Find UI elements related to the Theme Creator
  const themeCreator = document.getElementById("themeCreator");
  const closeButton = document.querySelector(
    ".themeCloseButton",
  ) as HTMLButtonElement;
  const resizeBar = document.querySelector(".resizeBar") as HTMLDivElement;

  // Unmount the Svelte component if it exists
  if (themeCreatorSvelteApp) unmount(themeCreatorSvelteApp);

  // Remove elements from the DOM
  if (themeCreator) themeCreator.remove();
  if (closeButton) closeButton.remove();
  if (resizeBar) resizeBar.remove();

  // Restore main content to full width
  const mainContent = document.querySelector("#container") as HTMLDivElement;
  if (mainContent) mainContent.style.width = "100%";
}
