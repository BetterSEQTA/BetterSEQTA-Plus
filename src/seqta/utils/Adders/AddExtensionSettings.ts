import { SettingsClicked, changeSettingsClicked, closeExtensionPopup } from "../Closers/closeExtensionPopup"
import renderSvelte from "@/interface/main"
import { SettingsResizer } from "@/seqta/ui/SettingsResizer"
import Settings from "@/interface/pages/settings.svelte"

export function addExtensionSettings() {
    const extensionPopup = document.createElement("div")
    extensionPopup.classList.add("outside-container", "hide")
    extensionPopup.id = "ExtensionPopup"
  
    const extensionContainer = document.querySelector(
      "#container",
    ) as HTMLDivElement
    if (extensionContainer) extensionContainer.appendChild(extensionPopup)
  
    // create shadow dom and render svelte app
    try {
      const shadow = extensionPopup.attachShadow({ mode: "open" })
      requestIdleCallback(() => renderSvelte(Settings, shadow))
    } catch (err) {
      console.error(err)
    }
  
    const container = document.getElementById("container")
  
    new SettingsResizer()
  
    container!.onclick = (event) => {
      if (!SettingsClicked) return
  
      if (!(event.target as HTMLElement).closest("#AddedSettings")) {
        if (event.target == extensionPopup) return
        changeSettingsClicked(closeExtensionPopup())
      }
    }
  }