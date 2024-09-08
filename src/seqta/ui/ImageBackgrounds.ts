import { getDataById, isIndexedDBSupported } from '@/svelte-interface/hooks/BackgroundDataLoader';

export async function appendBackgroundToUI() {
  const parent = document.getElementById('container');

  // embed background.html - old method
  /* const background = document.createElement('iframe');
  background.id = 'background';
  background.classList.add('imageBackground');
  background.setAttribute('excludeDarkCheck', 'true');
  background.src = browser.runtime.getURL('seqta/ui/background/background.html');
  parent!.appendChild(background); */
  if (!parent) return;

  const backgroundContainer = document.createElement('div');
  backgroundContainer.classList.add('imageBackground');
  backgroundContainer.setAttribute('excludeDarkCheck', 'true');

  const mediaContainer = document.createElement('div');
  mediaContainer.id = 'media-container';
  backgroundContainer.appendChild(mediaContainer);

  parent.appendChild(backgroundContainer);

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #media-container {
      width: 100%;
      height: 100%;
    }

    #media-container video, #media-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `;
  document.head.appendChild(style);

  // Load and display the background
  await loadBackground();
}

export async function loadBackground() {
  if (!isIndexedDBSupported()) {
    console.error("IndexedDB is not supported. Unable to load background.");
    return;
  }

  try {
    const selectedBackgroundId = localStorage.getItem('selectedBackground');
    if (!selectedBackgroundId) {
      const backgroundContainer = document.querySelector('.imageBackground');
      if (backgroundContainer) {
        backgroundContainer.remove();
      }
      return;
    }

    const background = await getDataById(selectedBackgroundId);
    if (!background) return;

    let backgroundContainer = document.querySelector('.imageBackground');
    if (!backgroundContainer) {
      backgroundContainer = document.createElement('div');
      backgroundContainer.classList.add('imageBackground');
      backgroundContainer.setAttribute('excludeDarkCheck', 'true');
      const parent = document.getElementById('container');
      if (parent) {
        parent.appendChild(backgroundContainer);
      }
    }

    let mediaContainer = document.getElementById('media-container');
    if (!mediaContainer) {
      mediaContainer = document.createElement('div');
      mediaContainer.id = 'media-container';
      backgroundContainer.appendChild(mediaContainer);
    }

    mediaContainer = document.getElementById('media-container');
    if (!mediaContainer) return;

    mediaContainer.innerHTML = '';

    const mediaElement = background.type === 'video' 
      ? document.createElement('video')
      : document.createElement('img');

    mediaElement.src = URL.createObjectURL(background.blob);
    mediaElement.classList.add('background');

    if (mediaElement instanceof HTMLVideoElement) {
      mediaElement.loop = true;
      mediaElement.muted = true;
      mediaElement.autoplay = true;
    }

    mediaContainer.appendChild(mediaElement);
  } catch (error) {
    console.error('Error loading background:', error);
  }
}