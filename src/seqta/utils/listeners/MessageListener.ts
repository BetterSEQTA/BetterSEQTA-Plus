import browser from "@/lib/browser";

import { closeExtensionPopup } from "@/seqta/utils/closers/closeExtensionPopup";
import { OpenMenuOptions } from "@/seqta/utils/openers/OpenMenuOptions";
import { isMenuOptionsOpen } from "@/seqta/utils/openers/menuOptionsState";

import sendThemeUpdate from "@/seqta/utils/sendThemeUpdate";
import hideSensitiveContent from "@/seqta/ui/dev/hideSensitiveContent";
import type { ThemeManager } from "@/plugins/built-in/themes/theme-manager";
import type { LoadedCustomTheme } from "@/types/CustomThemes";

let themeManagerPromise: Promise<ThemeManager> | null = null;

function getThemeManager(): Promise<ThemeManager> {
  if (!themeManagerPromise) {
    themeManagerPromise = import("@/plugins/built-in/themes/theme-manager").then(
      ({ ThemeManager }) => ThemeManager.getInstance(),
    );
  }
  return themeManagerPromise;
}

type SendResponse = (response?: unknown) => void;

type ThemeMessageBody = Record<string, unknown> & {
  themeID?: string;
  id?: string;
  enableTheme?: boolean;
};

type ContentScriptMessage = {
  info?: string;
  save?: boolean;
  body?: ThemeMessageBody;
};

export class MessageHandler {
  constructor() {
    browser.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }
  routeMessage(
    request: ContentScriptMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: SendResponse,
  ) {
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
              ...(request.body as LoadedCustomTheme),
              userEdited: true,
            });
            if (request.body?.enableTheme) {
              await themeManager.setTheme(request.body.id as string);
            }
            sendResponse({ status: "success" });
            sendThemeUpdate();
          };
          void save();
        } else {
          void getThemeManager().then((themeManager) => {
            if (request.body) {
              themeManager.updatePreview(request.body as Partial<LoadedCustomTheme>);
            }
            sendResponse({ status: "success" });
          });
        }
        return true;

      case "GetTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.getTheme(request.body!.themeID as string).then((theme) => {
            sendResponse(theme);
          });
        });
        return true;

      case "SetTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.setTheme(request.body!.themeID as string).then(() => {
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
          themeManager.deleteTheme(request.body!.themeID as string).then(() => {
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
        void import("@/plugins/built-in/themes/ThemeCreator").then(({ OpenThemeCreator }) => {
          void OpenThemeCreator(themeID ? String(themeID) : "");
        });
        closeExtensionPopup();
        sendResponse({ status: "success" });
        break;
      }

      case "ShareTheme":
        void getThemeManager().then((themeManager) => {
          themeManager.shareTheme(request.body!.themeID as string).then((id) => {
            sendResponse({ status: "success", id });
          });
        });
        return true;

      case "CloseThemeCreator":
        void import("@/plugins/built-in/themes/ThemeCreator").then(({ CloseThemeCreator }) => {
          try {
            CloseThemeCreator();
            sendResponse({ status: "success" });
          } catch (error) {
            console.error("Error closing theme creator:", error);
            sendResponse({ status: "error" });
          }
        });
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
