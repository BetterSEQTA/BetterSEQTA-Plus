import {
  getDataById,
  isIndexedDBSupported,
} from "@/interface/hooks/BackgroundDataLoader";

export async function appendBackgroundToUI() {
  const parent = document.getElementById("container");
  if (!parent) return;

  const backgroundContainer = document.createElement("div");
  backgroundContainer.classList.add("imageBackground");
  backgroundContainer.setAttribute("excludeDarkCheck", "true");

  const mediaContainer = document.createElement("div");
  mediaContainer.id = "media-container";
  backgroundContainer.appendChild(mediaContainer);

  parent.appendChild(backgroundContainer);
  await loadBackground();
  return;
}

let lastLoadedId: string | null = null;

export async function loadBackground() {
  if (!isIndexedDBSupported()) {
    console.error("IndexedDB is not supported. Unable to load background.");
    return;
  }

  try {
    const selectedBackgroundId = localStorage.getItem("selectedBackground");
    if (!selectedBackgroundId) {
      const backgroundContainer = document.querySelector(".imageBackground");
      if (backgroundContainer) {
        backgroundContainer.remove();
      }
      lastLoadedId = null;
      return;
    }

    const background = await getDataById(selectedBackgroundId);
    if (!background) return;

    // Skip reload if background hasn't changed and media element already exists
    if (
      selectedBackgroundId === lastLoadedId &&
      document.querySelector("#media-container > .background")
    ) {
      return;
    }

    let backgroundContainer = document.querySelector(".imageBackground");
    if (!backgroundContainer) {
      backgroundContainer = document.createElement("div");
      backgroundContainer.classList.add("imageBackground");
      backgroundContainer.setAttribute("excludeDarkCheck", "true");
      const parent = document.getElementById("container");
      if (parent) {
        parent.appendChild(backgroundContainer);
      }
    }

    let mediaContainer = document.getElementById("media-container");
    if (!mediaContainer) {
      mediaContainer = document.createElement("div");
      mediaContainer.id = "media-container";
      backgroundContainer.appendChild(mediaContainer);
    }

    mediaContainer = document.getElementById("media-container");
    if (!mediaContainer) return;

    mediaContainer.innerHTML = "";

    const mediaElement =
      background.type === "video"
        ? document.createElement("video")
        : document.createElement("img");

    mediaElement.src = URL.createObjectURL(background.blob);
    mediaElement.classList.add("background");

    if (mediaElement instanceof HTMLVideoElement) {
      mediaElement.loop = true;
      mediaElement.muted = true;
      mediaElement.autoplay = true;
    }

    mediaContainer.appendChild(mediaElement);
    lastLoadedId = selectedBackgroundId;
  } catch (error) {
    console.error("Error loading background:", error);
  }
}
