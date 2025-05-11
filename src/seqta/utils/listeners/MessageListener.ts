import browser from "webextension-polyfill";

import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
import {
  MenuOptionsOpen,
  OpenMenuOptions,
} from "@/seqta/utils/Openers/OpenMenuOptions";

import {
  CloseThemeCreator,
  OpenThemeCreator,
} from "@/plugins/built-in/themes/ThemeCreator";
import sendThemeUpdate from "@/seqta/utils/sendThemeUpdate";
import hideSensitiveContent from "@/seqta/ui/dev/hideSensitiveContent";
import { ThemeManager } from "@/plugins/built-in/themes/theme-manager";

// Get the singleton instance of the ThemeManager
const themeManager = ThemeManager.getInstance();

// MessageHandler class for routing different extension messages
export class MessageHandler {
  constructor() {
    // Add a listener for runtime messages, routing them to the appropriate handler
    // @ts-ignore to bypass type errors in the polyfill
    browser.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }

  // Route messages based on their 'info' property
  routeMessage(request: any, _sender: any, sendResponse: any) {
    console.debug("Message received:", request);

    // Handle the different request types
    switch (request.info) {
      case "EditSidebar":
        this.editSidebar(); // Edit the sidebar when this message is received
        closeExtensionPopup(); // Close the extension popup
        sendResponse({ status: "success" }); // Send success response
        break;

      case "UpdateThemePreview":
        // Update or save the theme preview depending on the 'save' flag
        if (request?.save == true) {
          const save = async () => {
            await themeManager.saveTheme(request.body); // Save the theme
            if (request.body.enableTheme) {
              await themeManager.setTheme(request.body.id); // Apply the theme if enabled
            }
            sendResponse({ status: "success" }); // Send success response
            sendThemeUpdate(); // Trigger a theme update
          };
          save();
        } else {
          themeManager.updatePreview(request.body); // Update the preview
          sendResponse({ status: "success" }); // Send success response
        }
        return true;

      case "GetTheme":
        // Fetch the theme by ID and send the result
        themeManager.getTheme(request.body.themeID).then((theme) => {
          sendResponse(theme);
        });
        return true;

      case "SetTheme":
        // Set the theme by ID
        themeManager.setTheme(request.body.themeID).then(() => {
          sendResponse({ status: "success" }); // Send success response
        });
        break;

      case "DisableTheme":
        // Disable the current theme
        themeManager.disableTheme().then(() => {
          sendResponse({ status: "success" }); // Send success response
        });
        break;

      case "DeleteTheme":
        // Delete a theme by ID
        themeManager.deleteTheme(request.body.themeID).then(() => {
          sendResponse({ status: "success" }); // Send success response
        });
        break;

      case "ListThemes":
        // Get and list all available themes
        themeManager.getAvailableThemes().then((themes) => {
          sendResponse(themes); // Send list of themes
        });
        return true;

      case "OpenThemeCreator":
        // Open the theme creator page, optionally with a specific theme ID
        const themeID = request?.body?.themeID;
        OpenThemeCreator(themeID ? themeID : "");
        closeExtensionPopup();
        sendResponse({ status: "success" });
        break;

      case "ShareTheme":
        // Share the theme by ID and send the resulting ID
        themeManager.shareTheme(request.body.themeID).then((id) => {
          sendResponse({ status: "success", id }); // Send success and shared theme ID
        });
        return true;

      case "CloseThemeCreator":
        try {
          // Attempt to close the theme creator page
          CloseThemeCreator();
        } catch (error) {
          console.error("Error closing theme creator:", error); // Log error if any
          sendResponse({ status: "error" }); // Send error response if failed
        }
        sendResponse({ status: "success" }); // Send success response
        break;

      case "HideSensitive":
        // Trigger the action to hide sensitive content
        hideSensitiveContent();
        sendResponse({ status: "success" }); // Send success response
        break;

      default:
        // Handle unknown request types
        console.debug("Unknown request info:", request.info);
    }
  }

  // Edit the sidebar if it's not already open
  editSidebar() {
    if (!MenuOptionsOpen) {
      OpenMenuOptions(); // Open the menu options if not already open
    }
  }
}
