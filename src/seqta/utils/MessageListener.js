/* global chrome */

import { MenuOptionsOpen, OpenMenuOptions, closeSettings } from "../../SEQTA.js";

export class MessageHandler {
  constructor() {
    chrome.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }

  routeMessage(request) {
    switch (request.info) {

    case "EditSidebar":
      this.editSidebar();
      break;
    case "Theme":
      console.log("Theme message received");
      break;
    
    default:
      console.log("Unknown request info:", request.info);
    
    }
  }

  editSidebar() {
    if (!MenuOptionsOpen) {
      OpenMenuOptions();
      closeSettings();
    }
  }

  // Add more methods for handling other message types
}

/* // Apply theme from the message
async function applyThemeFromMessage(themeData) {
  const style = document.createElement("style");
  style.innerHTML = themeData.css;
  document.head.appendChild(style);

  document.body.className = themeData.className;

  if (themeData.images) {
    for (const [cssVar, objectURL] of Object.entries(themeData.images)) {
      document.documentElement.style.setProperty(cssVar, `url(${objectURL})`);
    }
  } else {
    console.error("themeData.images is not defined!");
  }
} */