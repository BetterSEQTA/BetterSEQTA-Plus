import { settingsState } from "@/seqta/utils/listeners/SettingsState";  // Import the settings state to check animation preferences
import { animate } from "motion";  // Import the animate function from the motion library for animations

import { settingsPopup } from "@/interface/hooks/SettingsPopup";  // Import the settingsPopup object to trigger close actions

export let SettingsClicked = false;  // Initialize a flag to track if settings have been clicked

// Function to close the extension popup with optional animation
export const closeExtensionPopup = (extensionPopup?: HTMLElement) => {
  if (!extensionPopup)
    extensionPopup = document.getElementById("ExtensionPopup")!;  // Get the extension popup element if not provided

  extensionPopup.classList.add("hide");  // Add the "hide" class to the popup to hide it

  // If animations are enabled in the settings, animate the popup's opacity and scale
  if (settingsState.animations) {
    animate(1, 0, {  // Animate from opacity 1 to 0
      onUpdate: (progress) => {  // Update the opacity and scale based on animation progress
        extensionPopup.style.opacity = Math.max(0, progress).toString();  // Set the opacity
        extensionPopup.style.transform = `scale(${Math.max(0, progress)})`;  // Set the scale
      },
      type: "spring",  // Use spring animation for a smooth effect
      stiffness: 520,  // Set the stiffness of the spring animation
      damping: 20,  // Set the damping for the spring animation
    });
  } else {
    // If animations are disabled, directly set opacity and scale to hide the popup
    extensionPopup.style.opacity = "0";
    extensionPopup.style.transform = "scale(0)";
  }

  settingsPopup.triggerClose();  // Trigger the settings popup close action
  return (SettingsClicked = false);  // Reset the SettingsClicked flag to false
};

// Function to change the SettingsClicked flag
export function changeSettingsClicked(newVal: boolean) {
  SettingsClicked = newVal;  // Set the SettingsClicked flag to the new value
}
