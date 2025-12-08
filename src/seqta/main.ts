// Third-party libraries
import browser from "webextension-polyfill";

// Internal utilities and functions
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { detectSEQTAPlatform } from "@/seqta/utils/platformDetection";

// UI and theme management
import pageState from "@/pageState.js?url";

// Stylesheets
import injectedCSS from "@/css/injected.scss?inline";

export async function main() {
  return new Promise(async (resolve, reject) => {
    try {
      if (settingsState.onoff) {
        // Wait for body to be available if it doesn't exist yet
        let bodyWaitAttempts = 0;
        const maxBodyWaitAttempts = 50; // 5 seconds max
        while (!document.body && bodyWaitAttempts < maxBodyWaitAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          bodyWaitAttempts++;
        }
        
        if (!document.body) {
          console.error('[BetterSEQTA+] document.body is still null after waiting, cannot set platform attribute');
          reject(new Error('document.body is null'));
          return;
        }
        
        // Add platform detection to body for CSS targeting
        // Try to detect platform, and retry if it returns unknown (title might not be set yet)
        let platform = detectSEQTAPlatform();
        
        // If platform is unknown, wait a bit for title to be set and retry
        if (platform === 'unknown') {
          // Wait for title to be set (max 2 seconds)
          let attempts = 0;
          const maxAttempts = 20;
          while (platform === 'unknown' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            platform = detectSEQTAPlatform();
            attempts++;
          }
        }
        
        document.body.setAttribute('data-seqta-platform', platform);
        console.info(`[BetterSEQTA+] Detected platform: ${platform}`);

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
  const mainScript = document.createElement("script");
  mainScript.src = browser.runtime.getURL(pageState);
  document.head.appendChild(mainScript);
}
