import browser from 'webextension-polyfill'

export async function appendBackgroundToUI() {
  console.log('Starting appendBackgroundToUI...');

  const parent = document.getElementById('container');

  // embed background.html
  const background = document.createElement('iframe');
  background.id = 'background';
  background.classList.add('imageBackground');
  background.setAttribute('excludeDarkCheck', 'true');
  background.src = browser.runtime.getURL('backgrounds/background.html');
  parent!.appendChild(background);
}
