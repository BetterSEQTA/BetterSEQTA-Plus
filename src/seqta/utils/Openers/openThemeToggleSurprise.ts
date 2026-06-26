import browser from "webextension-polyfill";
import themeToggleSurpriseVideo from "@/resources/theme-toggle-surprise.mp4";

/** Maintainer note: the light/dark toggle easter egg (10 clicks) plays a Rick Roll video. */
const VIDEO_SRC = browser.runtime.getURL(themeToggleSurpriseVideo);
const POPOUT_ROOT_ID = "bsplus-ld-surprise-root";
/** Preload begins this many toggle clicks before the reveal. */
export const THEME_TOGGLE_SURPRISE_PRELOAD_AT = 5;
export const THEME_TOGGLE_SURPRISE_TRIGGER_AT = 10;

let playerRoot: HTMLElement | null = null;
let playerVideo: HTMLVideoElement | null = null;
let playerPlayOverlay: HTMLButtonElement | null = null;

function hostElement(): HTMLElement {
  return document.getElementById("container") ?? document.body;
}

function hidePlayOverlay(): void {
  playerPlayOverlay?.classList.add("bsplus-ld-surprise-play--hidden");
}

function showPlayOverlay(): void {
  playerPlayOverlay?.classList.remove("bsplus-ld-surprise-play--hidden");
}

function attachVideoSource(): void {
  if (!playerVideo) return;
  if (playerVideo.src === VIDEO_SRC) return;
  playerVideo.src = VIDEO_SRC;
  playerVideo.load();
}

function ensurePlayerShell(): void {
  if (playerRoot) return;

  const root = document.createElement("div");
  root.id = POPOUT_ROOT_ID;
  root.className =
    "bsplus-ld-surprise-root bsplus-ld-surprise-root--preloading";

  const aside = document.createElement("aside");
  aside.className = "bsplus-ld-surprise-popout";
  aside.setAttribute("role", "dialog");
  aside.setAttribute("aria-label", "Video player");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "bsplus-ld-surprise-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.addEventListener("click", closeThemeToggleSurprise);

  const video = document.createElement("video");
  video.className = "bsplus-ld-surprise-video";
  video.title = "Video player";
  video.preload = "auto";
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.addEventListener("error", () => {
    console.warn(
      "[BetterSEQTA+] Theme toggle surprise failed to load:",
      video.error,
    );
    showPlayOverlay();
  });

  const playOverlay = document.createElement("button");
  playOverlay.type = "button";
  playOverlay.className =
    "bsplus-ld-surprise-play bsplus-ld-surprise-play--hidden";
  playOverlay.setAttribute("aria-label", "Play video");
  playOverlay.addEventListener("click", () => {
    if (playerVideo) playWithUserGesture(playerVideo);
  });

  aside.append(closeBtn, video, playOverlay);
  root.append(aside);
  hostElement().append(root);

  playerRoot = root;
  playerVideo = video;
  playerPlayOverlay = playOverlay;
}

function playWithUserGesture(video: HTMLVideoElement): void {
  if (!video.src) {
    attachVideoSource();
  }
  if (!video.src) {
    showPlayOverlay();
    return;
  }

  video.currentTime = 0;
  video.muted = true;

  void video
    .play()
    .then(() => {
      video.muted = false;
      hidePlayOverlay();
    })
    .catch((error) => {
      console.warn(
        "[BetterSEQTA+] Theme toggle surprise play failed:",
        error,
        video.error,
      );
      showPlayOverlay();
    });
}

export function closeThemeToggleSurprise(): void {
  playerVideo?.pause();
  playerRoot?.remove();
  playerRoot = null;
  playerVideo = null;
  playerPlayOverlay = null;
}

export function preloadThemeToggleSurprise(): void {
  ensurePlayerShell();
  attachVideoSource();
}

export function openThemeToggleSurprise(): void {
  ensurePlayerShell();
  attachVideoSource();
  playerRoot!.classList.remove("bsplus-ld-surprise-root--preloading");
  playWithUserGesture(playerVideo!);
}
