import Settings from "./pages/settings.svelte";
import renderSvelte from "./main";
import { initializeSettingsState } from "@/seqta/utils/listeners/SettingsState";
import { initVerboseLogging, verboseInfo } from "@/utils/verboseLog";

const mountPoint = document.getElementById("app");
if (!mountPoint) {
  // In production, Rollup may put this entry in a shared chunk that content
  // scripts load via `import("@/interface/main")`. Only the settings page
  // has `#app` — never throw on SEQTA tabs.
  verboseInfo("[BetterSEQTA+] Settings bootstrap skipped (no #app — not the settings page)");
} else {
  void (async () => {
    await initializeSettingsState();
    initVerboseLogging();
    const { syncApiBaseToBackground } = await import("@/seqta/utils/DevApiBase");
    syncApiBaseToBackground();
    renderSvelte(Settings, mountPoint, { standalone: true });
  })();
}
