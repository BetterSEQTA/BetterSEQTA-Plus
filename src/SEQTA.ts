import {
  initializeSettingsState, // Function to initialize the settings state from storage or default
  settingsState, // Reactive state object holding current settings
} from "@/seqta/utils/listeners/SettingsState";
import documentLoadCSS from "@/css/documentload.scss?inline"; // Inline CSS to apply on document load
import icon48 from "@/resources/icons/icon-48.png?base64"; // Base64 encoded icon image
import browser from "webextension-polyfill"; // WebExtension API polyfill for cross-browser compatibility

import * as plugins from "@/plugins"; // Import all plugins
import { main } from "@/seqta/main"; // Main initialization function for BetterSEQTA+

export let MenuOptionsOpen = false; // Global flag to track if menu options are open

var IsSEQTAPage = false; // Flag to track if the current page is a SEQTA page
let hasSEQTAText = false; // Flag to track if SEQTA copyright text is present

// This check is placed outside of the document load event due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
if (document.childNodes[1]) {
  hasSEQTAText =
    document.childNodes[1].textContent?.includes(
      "Copyright (c) SEQTA Software",
    ) ?? false;
  init(); // Begin initialization if SEQTA copyright text is found
}

async function init() {
  const hasSEQTATitle = document.title.includes("SEQTA Learn"); // Check if document title indicates SEQTA Learn

  if (hasSEQTAText && hasSEQTATitle && !IsSEQTAPage) {
    // Verify we are on a SEQTA page
    IsSEQTAPage = true;
    console.info("[BetterSEQTA+] Verified SEQTA Page");

    const documentLoadStyle = document.createElement("style"); // Create a new <style> element
    documentLoadStyle.textContent = documentLoadCSS; // Set the style content
    document.head.appendChild(documentLoadStyle); // Append it to the document head

    const icon = document.querySelector(
      'link[rel*="icon"]',
    )! as HTMLLinkElement;
    icon.href = icon48; // Change the page's favicon to the custom icon

    try {
      await initializeSettingsState(); // Load or initialize settings state

      if (typeof settingsState.onoff === "undefined") {
        await browser.runtime.sendMessage({ type: "setDefaultStorage" }); // Set default storage if not already defined
      }

      await main(); // Run the main initialization logic

      if (settingsState.onoff) {
        // Initialize legacy plugins
        plugins.Monofile();

        // Initialize new plugin system
        await plugins.initializePlugins();
      }

      console.info(
        "[BetterSEQTA+] Successfully initialised BetterSEQTA+, starting to load assets.",
      );
    } catch (error: any) {
      console.error(error); // Log any initialization errors
    }
  }
}
