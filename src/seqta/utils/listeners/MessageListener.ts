import browser from "webextension-polyfill";

import { closeExtensionPopup } from "@/seqta/utils/Closers/closeExtensionPopup";
import { OpenMenuOptions } from "@/seqta/utils/Openers/OpenMenuOptions";
import { isMenuOptionsOpen } from "@/seqta/utils/Openers/menuOptionsState";

import sendThemeUpdate from "@/seqta/utils/sendThemeUpdate";
import hideSensitiveContent from "@/seqta/ui/dev/hideSensitiveContent";
import type { ThemeManager } from "@/plugins/built-in/themes/theme-manager";

let themeManagerPromise: Promise<ThemeManager> | null = null;

function getThemeManager(): Promise<ThemeManager> {
  if (!themeManagerPromise) {
    themeManagerPromise = import("@/plugins/built-in/themes/theme-manager").then(
      ({ ThemeManager }) => ThemeManager.getInstance(),
    );
  }
  return themeManagerPromise;
}

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
            const themeManager = await getThemeManager();
            await themeManager.saveTheme({
              ...request.body,
              userEdited: true,
            });
            if (request.body.enableTheme) {
              await themeManager.setTheme(request.body.id);
            }
            sendResponse({ status: "success" });
            sendThemeUpdate();
          };
          void save();
        } else {
          void getThemeManager().then((themeManager) => {
            themeManager.updatePreview(request.body);
            sendResponse({ status: "success" });
          });
        }
        return true;

      case "GetTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.getTheme(request.body.themeID).then((theme) => {
            sendResponse(theme);
          });
        });
        return true;

      case "SetTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.setTheme(request.body.themeID).then(() => {
            sendResponse({ status: "success" });
          });
        });
        return true;

      case "DisableTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.disableTheme().then(() => {
            sendResponse({ status: "success" });
          });
        });
        return true;

      case "DeleteTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.deleteTheme(request.body.themeID).then(() => {
            sendResponse({ status: "success" });
          });
        });
        return true;

      case "ListThemes":
        void getThemeManager().then((themeManager) => {
          themeManager.getAvailableThemes().then((themes) => {
            sendResponse(themes);
          });
        });
        return true;

      case "OpenThemeCreator": {
        const themeID = request?.body?.themeID;
        void import("@/plugins/built-in/themes/ThemeCreator").then(
          ({ OpenThemeCreator }) => {
            void OpenThemeCreator(themeID ? themeID : "");
          },
        );
        closeExtensionPopup();
        sendResponse({ status: "success" });
        break;
      }

      case "ShareTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.shareTheme(request.body.themeID).then((id) => {
            sendResponse({ status: "success", id });
          });
        });
        return true;

      case "CloseThemeCreator":
        void import("@/plugins/built-in/themes/ThemeCreator").then(
          ({ CloseThemeCreator }) => {
            try {
              CloseThemeCreator();
              sendResponse({ status: "success" });
            } catch (error) {
              console.error("Error closing theme creator:", error);
              sendResponse({ status: "error" });
            }
          },
        );
        return true;

      case "HideSensitive":
        hideSensitiveContent();
        sendResponse({ status: "success" });
        break;

      default:
        console.debug("Unknown request info:", request.info);
    }
  }

  editSidebar() {
    if (!isMenuOptionsOpen()) {
      OpenMenuOptions();
    }
  }
}
