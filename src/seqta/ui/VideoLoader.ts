import Browser from "webextension-polyfill";

/**
 * Injects a YouTube iframe into the specified element.
 *
 * @param videoId - The YouTube video ID to embed.
 * @param playlistId - The YouTube playlist ID to allow embed to loop.
 * @param mountElement - The element to mount the iframe to.
 * @param hideControls - Whether to hide the YouTube player controls.
 * @param mute - Whether to mute the video.
 * @param width - The width of the iframe.
 * @param height - The height of the iframe.
 */
export function injectYouTubeVideo(videoId: string, playlistId: string, mountElement: HTMLElement, hideControls: boolean, mute: boolean, width: string, height: string): void {
  const controlsParam = hideControls ? 'controls=0' : 'controls=1';
  const autoplayParam = 'autoplay=1';
  const muteParam = mute ? 'mute=1' : 'mute=0';
  const listParams = playlistId ? `list=${playlistId}&` : '';

  const iframeSrc = `https://www.youtube.com/embed/${videoId}?${listParams}${autoplayParam}&${controlsParam}&${muteParam}&loop=1`;
  const iframe = document.createElement('iframe');

  iframe.width = width;
  iframe.height = height;
  iframe.src = iframeSrc;
  iframe.frameBorder = '0';
  iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;

  iframe.onload = () => {
    Browser.runtime.sendMessage({ type: 'youtubeIframe', hideControls });
  };

  mountElement.innerHTML = ''; // Clear any existing content
  mountElement.appendChild(iframe);

  /* if (hideControls) {
    applyCustomStylesToIframe(iframe);
  } */
}

/**
 * Function to inject CSS styles into the iframe.
 *
 * @param hideControls - Whether to hide the YouTube player controls.
 */
export function applyYoutubeStyles(hideControls: boolean) {
  if (window.location == window.parent.location) return;
  if (!window.location.href.includes('youtube.com/embed/')) return;

  if (hideControls) {
    const hideControlsCss = `
      .ytp-gradient-top,
      .ytp-chrome-bottom,
      .ytp-chrome-top,
      .ytp-chrome-top-buttons,
      .ytp-pause-overlay,
      .ytp-watermark {
        display: none !important;
      }
    `;
    const hideControlsStyle = document.createElement('style');
    hideControlsStyle.textContent = hideControlsCss;
    document.head.appendChild(hideControlsStyle);

    const f =() => {
      const btn = document.querySelector('.ytp-ad-skip-button') as HTMLButtonElement | null;
      const adText = document.querySelector('.ytp-ad-text');
      const v = document.querySelector('video')!;
      if(adText){
          v.currentTime = v.duration
      }
      if(btn){
          v.currentTime = v.duration
          btn.click();
      }
    }
    setInterval(f, 100);
  }
}
