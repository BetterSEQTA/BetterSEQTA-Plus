import "./index.css";
import Settings from "./pages/settings.svelte";
import IconFamily from "@/resources/fonts/IconFamily.woff";
import browser from "webextension-polyfill";
import renderSvelte from "./main";
import { initializeSettingsState } from "@/seqta/utils/listeners/SettingsState";

function InjectCustomIcons() {
  console.info("[BetterSEQTA+] Injecting Icons");

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
  renderSvelte(Settings, mountPoint, { standalone: true });
})();
