import "./index.css";
import Settings from "./pages/settings.svelte";
import IconFamily from "@/resources/fonts/IconFamily.woff";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
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
      src: url('${resolveExtensionAssetUrl(IconFamily)}') format('woff');
      font-weight: normal;
      font-style: normal;
    }`;
  document.head.appendChild(style);
}

const mountPoint = document.getElementById("app");
if (!mountPoint) {
  // In production, Rollup may put this entry in a shared chunk that content
  // scripts load via `import("@/interface/main")`. Only the settings page
  // has `#app` — never throw on SEQTA tabs.
  verboseInfo(
    "[BetterSEQTA+] Settings bootstrap skipped (no #app — not the settings page)",
  );
} else {
  InjectCustomIcons();

  void (async () => {
    await initializeSettingsState();
    initVerboseLogging();
    renderSvelte(Settings, mountPoint, { standalone: true });
  })();
}