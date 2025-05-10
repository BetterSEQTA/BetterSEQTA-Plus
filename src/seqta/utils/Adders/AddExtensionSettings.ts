import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";  // Import functions for handling settings popup behavior
import renderSvelte from "@/interface/main";  // Import the function to render Svelte components
import { SettingsResizer } from "@/seqta/ui/SettingsResizer";  // Import the SettingsResizer class for resizing functionality
import Settings from "@/interface/pages/settings.svelte";  // Import the Svelte settings component

// Function to add and display the extension settings popup
export function addExtensionSettings() {
  const extensionPopup = document.createElement("div");  // Create a new <div> element for the popup
  extensionPopup.classList.add("outside-container", "hide");  // Add CSS classes for styling and hiding initially
  extensionPopup.id = "ExtensionPopup";  // Set the ID for the popup element

  const extensionContainer = document.querySelector(
    "#container",
  ) as HTMLDivElement;  // Select the container element where the popup will be added
  if (extensionContainer) extensionContainer.appendChild(extensionPopup);  // Append the popup to the container if found

  // Try to create a shadow DOM for the popup and render the Svelte settings component inside it
  try {
    const shadow = extensionPopup.attachShadow({ mode: "open" });  // Attach an open shadow DOM to the popup
    requestIdleCallback(() => renderSvelte(Settings, shadow));  // Render the Svelte settings component when the browser is idle
  } catch (err) {
    console.error(err);  // Log an error if something goes wrong while rendering the settings
  }

  const container = document.getElementById("container");  // Get the container element again for event handling

  new SettingsResizer();  // Initialize the settings resizer to allow resizing of the popup

  // Add a click event listener to the container to handle clicks outside the settings popup
  container!.onclick = (event) => {
    if (!SettingsClicked) return;  // If settings were not clicked, do nothing

    // If the click is outside the settings popup, close the popup
    if (!(event.target as HTMLElement).closest("#AddedSettings")) {
      if (event.target == extensionPopup) return;  // If clicked on the popup itself, don't close
      changeSettingsClicked(closeExtensionPopup());  // Close the settings popup
    }
  };
}
