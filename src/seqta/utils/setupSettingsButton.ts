import {
  changeSettingsClicked, // Import function to update the settings clicked state
  closeExtensionPopup, // Import function to close the extension popup
  SettingsClicked, // Import the state variable for whether settings have been clicked
} from "./Closers/closeExtensionPopup"; 
import { animate } from "motion"; // Import animation utilities
import { settingsState } from "./listeners/SettingsState"; // Import settings state

// Function to set up the settings button click behavior
export function setupSettingsButton() {
  var AddedSettings = document.getElementById("AddedSettings"); // Get the settings button element
  var extensionPopup = document.getElementById("ExtensionPopup"); // Get the extension popup element

  // Add event listener to handle settings button click
  AddedSettings!.addEventListener("click", async () => {
    if (SettingsClicked) { // If settings have already been clicked
      closeExtensionPopup(extensionPopup as HTMLElement); // Close the extension popup
    } else {
      if (settingsState.animations) { // If animations are enabled
        animate(0, 1, { // Animate opacity and scale to smoothly show the popup
          onUpdate: (progress) => {
            extensionPopup!.style.opacity = progress.toString(); // Update opacity
            extensionPopup!.style.transform = `scale(${progress})`; // Update scale
          },
          type: "spring", // Use spring-based animation
          stiffness: 280, // Stiffness of the spring
          damping: 20, // Damping for smoothness
        });
      } else {
        extensionPopup!.style.opacity = "1"; // Set opacity to 1 for instant visibility
        extensionPopup!.style.transform = "scale(1)"; // Set scale to 1 for no zoom effect
        extensionPopup!.style.transition =
          "opacity 0s linear, transform 0s linear"; // Disable transitions for instant effect
      }
      extensionPopup!.classList.remove("hide"); // Remove the "hide" class to display the popup
      changeSettingsClicked(true); // Update settings state to indicate settings were clicked
    }
  });
}
