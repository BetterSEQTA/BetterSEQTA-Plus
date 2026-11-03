import { settingsState } from "@/seqta/utils/listeners/settingsState";
import { addShortcuts } from "@/seqta/utils/adders/addShortcuts";
import { createCustomShortcutDiv } from "@/seqta/utils/createEnable/createCustomShortcutDiv";

export function renderShortcuts() {
  const container = document.getElementById("shortcuts");
  if (!container) return;

  container.innerHTML = "";

  try {
    addShortcuts(settingsState.shortcuts || []);
  } catch (err: unknown) {
    console.error(
      "[BetterSEQTA+] Error adding built-in shortcuts:",
      err instanceof Error ? err.message : err,
    );
  }

  const custom = settingsState.customshortcuts || [];
  for (const element of custom) {
    try {
      createCustomShortcutDiv(element);
    } catch (err: unknown) {
      console.error(
        "[BetterSEQTA+] Error adding custom shortcut:",
        element?.name,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
