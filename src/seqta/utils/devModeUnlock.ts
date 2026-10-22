import { settingsState } from "@/seqta/utils/listeners/SettingsState";

let sequence = "";
let onKeyDown: ((event: KeyboardEvent) => void) | null = null;
let disarmTimer: ReturnType<typeof setTimeout> | null = null;

function disarm(): void {
  if (onKeyDown) {
    window.removeEventListener("keydown", onKeyDown, true);
    onKeyDown = null;
  }
  if (disarmTimer) {
    clearTimeout(disarmTimer);
    disarmTimer = null;
  }
  sequence = "";
}

/** Click BetterSEQTA+ logo in settings, then type `dev` within 10s (works in shadow DOM popout). */
export function armDevModeUnlock(): void {
  disarm();
  onKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    sequence += event.key.toLowerCase();
    if (sequence.includes("dev")) {
      disarm();
      settingsState.devMode = true;
      alert("Dev mode is now enabled");
    }
  };
  window.addEventListener("keydown", onKeyDown, true);
  disarmTimer = setTimeout(disarm, 10_000);
}
