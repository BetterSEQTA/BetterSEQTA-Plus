import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { addShortcuts } from "@/seqta/utils/Adders/AddShortcuts";
import { CreateCustomShortcutDiv } from "@/seqta/utils/CreateEnable/CreateCustomShortcutDiv";

export function renderShortcuts() {
  const container = document.getElementById("shortcuts");
  if (!container) return;

  container.innerHTML = "";

  try {
    addShortcuts(settingsState.shortcuts || []);
  } catch (err: any) {
    console.error("[BetterSEQTA+] Error adding built-in shortcuts:", err?.message || err);
  }

  const custom = settingsState.customshortcuts || [];
  for (const element of custom) {
    try {
      CreateCustomShortcutDiv(element);
    } catch (err: any) {
      console.error("[BetterSEQTA+] Error adding custom shortcut:", element?.name, err?.message || err);
    }
  }
}

