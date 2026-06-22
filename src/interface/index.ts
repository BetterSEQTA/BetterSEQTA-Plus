import "./index.css";
import Settings from "./pages/settings.svelte";
import IconFamily from "@/resources/fonts/IconFamily.woff";
import browser from "webextension-polyfill";
import renderSvelte from "./main";
import { initializeSettingsState } from "@/seqta/utils/listeners/SettingsState";
import { initVerboseLogging, verboseInfo } from "@/utils/verboseLog";

function InjectCustomIcons() {
  verboseInfo("[BetterSEQTA+] Injecting Icons");

  const style = document.createElement("style");
  style.setAttribute("type", "text/css");
  style.innerHTML = `
    @font-face {
      font-family: 'IconFamily';
      src: url('${browser.runtime.getURL(IconFamily)}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`;
  document.head.appendChild(style);
}

const mountPoint = document.getElementById("app");
if (!mountPoint) {
  console.error("Mount point #app not found");
  throw new Error("Mount point #app not found");
}

InjectCustomIcons();

(async () => {
  await initializeSettingsState();
  initVerboseLogging();
  renderSvelte(Settings, mountPoint, { standalone: true });
})();
