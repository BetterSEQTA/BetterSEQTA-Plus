import browser from 'webextension-polyfill'

import { MenuOptionsOpen, OpenMenuOptions, closeSettings } from '../../SEQTA';
import { deleteTheme, disableTheme, downloadTheme, listThemes, setTheme } from '../ui/Themes';

export class MessageHandler {
  constructor() {
    browser.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }
  // @ts-ignore
  routeMessage(request: any, sender: any, sendResponse: any) {
    switch (request.info) {

    case 'EditSidebar':
      this.editSidebar();
      sendResponse({ status: 'success' });
      break;

    /* Theme related */
    case 'SetTheme':
      console.log(request);
      setTheme(request.body.themeName, request.body.themeURL).then(() => {
        sendResponse({ status: 'success' });
      });
      return true;
    case 'DownloadTheme':
      downloadTheme(request.body.themeName, request.body.themeURL).then(() => {
        sendResponse({ status: 'success' });
      });
      return true;
    case 'ListThemes':
      listThemes().then((response) => {
        sendResponse(response);
      });
      return true;
    case 'DisableTheme':
      disableTheme().then(() => {
        sendResponse({ status: 'success' });
      });
      return true;
    case 'DeleteTheme':
      deleteTheme(request.body.themeName).then(() => {
        sendResponse({ status: 'success' });
      });
      return true;
    
    default:
      console.log('Unknown request info:', request.info);
    
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