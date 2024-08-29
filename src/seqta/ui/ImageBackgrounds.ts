import browser from 'webextension-polyfill';

export async function appendBackgroundToUI() {
  const parent = document.getElementById('container');

  // embed background.html
  const background = document.createElement('iframe');
  background.id = 'background';
  background.classList.add('imageBackground');
  background.setAttribute('excludeDarkCheck', 'true');
  background.src = browser.runtime.getURL('seqta/ui/background/background.html');
  parent!.appendChild(background);
}
