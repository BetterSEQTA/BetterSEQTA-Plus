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

const themeManager = ThemeManager.getInstance();

export class MessageHandler {
  constructor() {
    // @ts-ignore
    browser.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }
  routeMessage(request: any, _sender: any, sendResponse: any) {
    console.debug("Message received:", request);

    switch (request.info) {
      case "EditSidebar":
        this.editSidebar();
        closeExtensionPopup();
        sendResponse({ status: "success" });
        break;

      case "UpdateThemePreview":
        if (request?.save == true) {
          const save = async () => {
            await themeManager.saveTheme(request.body);
            if (request.body.enableTheme) {
              await themeManager.setTheme(request.body.id);
            }
            sendResponse({ status: "success" });
            sendThemeUpdate();
          };
          save();
        } else {
          themeManager.updatePreview(request.body);
          sendResponse({ status: "success" });
        }
        return true;

      case "GetTheme":
        themeManager.getTheme(request.body.themeID).then((theme) => {
          sendResponse(theme);
        });
        return true;

      case "SetTheme":
        themeManager.setTheme(request.body.themeID).then(() => {
          sendResponse({ status: "success" });
        });
        break;

      case "DisableTheme":
        themeManager.disableTheme().then(() => {
          sendResponse({ status: "success" });
        });
        break;

      case "DeleteTheme":
        themeManager.deleteTheme(request.body.themeID).then(() => {
          sendResponse({ status: "success" });
        });
        break;

      case "ListThemes":
        themeManager.getAvailableThemes().then((themes) => {
          sendResponse(themes);
        });
        return true;

      case "OpenThemeCreator":
        const themeID = request?.body?.themeID;
        OpenThemeCreator(themeID ? themeID : "");
        closeExtensionPopup();
        sendResponse({ status: "success" });
        break;

      case "ShareTheme":
        themeManager.shareTheme(request.body.themeID).then((id) => {
          sendResponse({ status: "success", id });
        });
        return true;

      case "CloseThemeCreator":
        try {
          CloseThemeCreator();
        } catch (error) {
          console.error("Error closing theme creator:", error);
          sendResponse({ status: "error" });
        }
        sendResponse({ status: "success" });
        break;

      case "HideSensitive":
        hideSensitiveContent();
        sendResponse({ status: "success" });
        break;

      default:
        console.debug("Unknown request info:", request.info);
    }
  }

  editSidebar() {
    if (!MenuOptionsOpen) {
      OpenMenuOptions();
    }
  }
}
