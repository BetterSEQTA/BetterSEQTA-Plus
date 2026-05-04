// Third-party libraries

// Internal utilities and functions
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { extensionAssetUrl } from "@/seqta/utils/extensionAsset";

// UI and theme management
import pageState from "@/pageState.js?url";

// Stylesheets
import injectedCSS from "@/css/injected.scss?inline";

export async function main() {
  return new Promise(async (resolve, reject) => {
    try {
      if (settingsState.onoff) {
        injectPageState();

        // Rather permanent FIX for bug! -> this is a hack to get the injected.css file to have HMR in development mode as this import system is currently broken with crxjs
        if (import.meta.env.MODE === "development") {
          import("@/css/injected.scss");
        } else {
          const injectedStyle = document.createElement("style");
          injectedStyle.textContent = injectedCSS;
          document.head.appendChild(injectedStyle);
        }
      }
      resolve(true);
    } catch (error: any) {
      console.error(error);
      reject(error);
    }
  });
}

function injectPageState() {
  const scriptUrl = extensionAssetUrl(pageState);
  if (!scriptUrl) {
    console.warn("[BetterSEQTA+] Could not resolve pageState script URL.");
    return;
  }
  const mainScript = document.createElement("script");
  mainScript.src = scriptUrl;
  document.head.appendChild(mainScript);
}
