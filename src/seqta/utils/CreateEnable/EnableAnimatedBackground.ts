import { settingsState } from "../listeners/SettingsState"
import { CreateBackground } from "./CreateBackground"
import { RemoveBackground } from "../DisableRemove/RemoveBackground"

export function enableAnimatedBackground() {
  if (settingsState.animatedbk) {
    CreateBackground()
  } else {
    RemoveBackground()
    document.getElementById("container")!.style.background =
      "var(--background-secondary)"
  }
}