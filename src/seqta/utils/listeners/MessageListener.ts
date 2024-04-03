import browser from 'webextension-polyfill'

import { MenuOptionsOpen, OpenMenuOptions, OpenWhatsNewPopup, closeSettings } from '../../../SEQTA';
import { UpdateThemePreview, deleteTheme, disableTheme, getAvailableThemes, getTheme, saveTheme, setTheme } from '../../ui/Themes';
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
          const save = async () => {
            console.log('Saving theme:', request.body)
            await saveTheme(request.body)
            await setTheme(request.body.id)
            sendResponse({ status: 'success' });
          }
          save()
        } else {
          UpdateThemePreview(request.body);
          sendResponse({ status: 'success' });
        }
        return true;
      
      case 'GetTheme':
        getTheme(request.body.themeID).then((theme) => {
          sendResponse(theme);
        });
        return true;
  
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
        const themeID = request?.body?.themeID;
        OpenThemeCreator( themeID ? themeID : '' );
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