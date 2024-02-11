import backgroundPage from 'url:./background/background.html'
import browser from 'webextension-polyfill';
import { SettingsState } from '../../types/storage';

export async function appendBackgroundToUI() {
  const settings = await browser.storage.local.get() as SettingsState;

  if (settings.theme == '') return; 

  const parent = document.getElementById('container');

  // embed background.html
  const background = document.createElement('iframe');
  background.id = 'background';
  background.classList.add('imageBackground');
  background.setAttribute('excludeDarkCheck', 'true');
  background.src = backgroundPage;
  parent!.appendChild(background);
}
