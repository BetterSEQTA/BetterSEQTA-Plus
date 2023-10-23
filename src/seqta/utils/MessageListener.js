/* global chrome */

import { MenuOptionsOpen, OpenMenuOptions, closeSettings } from "../../SEQTA.js";

export class MessageHandler {
  constructor() {
    // Register this class as the message handler for the Chrome extension
    chrome.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }

  routeMessage(request) {
    // You can use a switch-case or an object to route the message to the correct handler
    switch (request.info) {

    case "EditSidebar":
      this.editSidebar();
      break;
    // Add more cases as needed
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