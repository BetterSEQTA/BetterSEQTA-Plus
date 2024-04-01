import browser from 'webextension-polyfill'

import { MenuOptionsOpen, OpenMenuOptions, OpenWhatsNewPopup, closeSettings } from '../../../SEQTA';
import { UpdateThemePreview, deleteTheme, disableTheme, getAvailableThemes, saveTheme, setTheme } from '../../ui/Themes';
import { CloseThemeCreator, OpenThemeCreator } from '../../ui/ThemeCreator';

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
  
      case 'UpdateThemePreview':
        if (request?.save == true) {
          saveTheme(request.body).then(() => {
            setTheme(request.body.themeID).then(() => {
              sendResponse({ status: 'success' });
            });
          });
        } else {
          UpdateThemePreview(request.body);
          sendResponse({ status: 'success' });
        }
        break;
  
      case 'SaveTheme':
        saveTheme(request.body).then(() => {
          sendResponse({ status: 'success' });
        });
        break;
  
      case 'SetTheme':
        setTheme(request.body.themeID).then(() => {
          sendResponse({ status: 'success' });
        });
        break;
  
      case 'DisableTheme':
        disableTheme().then(() => {
          sendResponse({ status: 'success' });
        });
        break;
  
      case 'DeleteTheme':
        deleteTheme(request.body.themeID).then(() => {
          sendResponse({ status: 'success' });
        });
        break;

      case 'ListThemes':
        getAvailableThemes().then((themes) => {
          sendResponse(themes);
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

      case 'CloseThemeCreator':
        CloseThemeCreator();
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