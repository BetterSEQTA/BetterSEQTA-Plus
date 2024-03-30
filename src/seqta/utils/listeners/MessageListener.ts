import browser from 'webextension-polyfill'

import { MenuOptionsOpen, OpenMenuOptions, OpenWhatsNewPopup, closeSettings } from '../../../SEQTA';
import { deleteTheme, disableTheme, downloadTheme, listThemes, setTheme } from '../../ui/Themes';
import { OpenThemeCreator } from '../../ui/ThemeCreator';

export class MessageHandler {
  constructor() {
    browser.runtime.onMessage.addListener(this.routeMessage.bind(this));
  }
  routeMessage(request: any, _sender: any, sendResponse: any) {
    switch (request.info) {

    case 'EditSidebar':
      this.editSidebar();
      closeSettings();
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
    case 'OpenChangelog':
      OpenWhatsNewPopup();
      closeSettings();
      sendResponse({ status: 'success' });
      break;
    case 'OpenThemeCreator':
      OpenThemeCreator();
      closeSettings();
      sendResponse({ status: 'success' });
      break;
    
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
}