import browser from 'webextension-polyfill';
import { SettingsState } from '../../types/storage';
import backgroundURL from './background/background.html?url'

export async function appendBackgroundToUI() {
  const settings = await browser.storage.local.get() as SettingsState;

  if (settings.theme == '') return; 

  const parent = document.getElementById('container');

  // embed background.html
  const background = document.createElement('iframe');
  background.id = 'background';
  background.classList.add('imageBackground');
  background.setAttribute('excludeDarkCheck', 'true');
  background.src = browser.runtime.getURL(backgroundURL);
  parent!.appendChild(background);
}
