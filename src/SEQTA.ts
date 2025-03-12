
import {
  initializeSettingsState,
  settingsState,
} from "@/seqta/utils/listeners/SettingsState"
import documentLoadCSS from "@/css/documentload.scss?inline"

import icon48 from "@/resources/icons/icon-48.png?base64"

export let MenuOptionsOpen = false

var IsSEQTAPage = false
let hasSEQTAText = false

// This check is placed outside of the document load event due to issues with EP (https://github.com/BetterSEQTA/BetterSEQTA-Plus/issues/84)
if (document.childNodes[1]) {
  hasSEQTAText =
    document.childNodes[1].textContent?.includes(
      "Copyright (c) SEQTA Software",
    ) ?? false
  init()
}

import * as plugins from "@/plugins" // Import the plugins from folder



async function init() {
  const hasSEQTATitle = document.title.includes("SEQTA Learn")

  if (hasSEQTAText && hasSEQTATitle && !IsSEQTAPage) { // Verify we are on a SEQTA page
    IsSEQTAPage = true
    console.info("[BetterSEQTA+] Verified SEQTA Page")

    const documentLoadStyle = document.createElement("style")
    documentLoadStyle.textContent = documentLoadCSS
    document.head.appendChild(documentLoadStyle)

    const icon = document.querySelector('link[rel*="icon"]')! as HTMLLinkElement
    icon.href = icon48 // Change the icon

    try {
      // wait until settingsState has been loaded from storage
      await initializeSettingsState()

      if (settingsState.onoff) {
        Object.values(plugins).forEach(plugin => {
          plugin();
        })
        
      }
      console.info(
        "[BetterSEQTA+] Successfully initalised BetterSEQTA+, starting to load assets.",
      )
    } catch (error: any) {
      console.error(error)
    }
  }
}