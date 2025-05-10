import {
  getDataById, // Imports the function to retrieve data by ID from the background data loader
  isIndexedDBSupported, // Imports the function to check if IndexedDB is supported by the browser
} from "@/interface/hooks/BackgroundDataLoader"; // Path to the background data loader module

/**
 * Appends the background container and media elements to the UI.
 * Creates a container for the background and appends it to the "container" element.
 * Then, it triggers the background loading process.
 */
export async function appendBackgroundToUI() {
  const parent = document.getElementById("container"); // Gets the parent element with the ID 'container'
  if (!parent) return; // Exits if the parent element is not found

  const backgroundContainer = document.createElement("div"); // Creates a new div for the background container
  backgroundContainer.classList.add("imageBackground"); // Adds a class to the background container
  backgroundContainer.setAttribute("excludeDarkCheck", "true"); // Sets a custom attribute on the container

  const mediaContainer = document.createElement("div"); // Creates a container for the media (image or video)
  mediaContainer.id = "media-container"; // Sets the ID for the media container
  backgroundContainer.appendChild(mediaContainer); // Appends the media container to the background container

  parent.appendChild(backgroundContainer); // Appends the background container to the parent container
  await loadBackground(); // Calls the function to load the background
  return;
}

/**
 * Loads the background based on the selected ID stored in localStorage.
 * Checks if IndexedDB is supported and retrieves the background data if available.
 */
export async function loadBackground() {
  if (!isIndexedDBSupported()) { // Checks if IndexedDB is supported by the browser
    console.error("IndexedDB is not supported. Unable to load background."); // Logs an error if not supported
    return;
  }

  try {
    const selectedBackgroundId = localStorage.getItem("selectedBackground"); // Retrieves the selected background ID from localStorage
    if (!selectedBackgroundId) { // If no background is selected
      const backgroundContainer = document.querySelector(".imageBackground"); // Finds the background container
      if (backgroundContainer) {
        backgroundContainer.remove(); // Removes the background container if no background is selected
      }
      return;
    }

    const background = await getDataById(selectedBackgroundId); // Retrieves the background data by ID
    if (!background) return; // If no background is found, exits the function

    let backgroundContainer = document.querySelector(".imageBackground"); // Searches for the existing background container
    if (!backgroundContainer) { // If no background container exists, creates one
      backgroundContainer = document.createElement("div");
      backgroundContainer.classList.add("imageBackground");
      backgroundContainer.setAttribute("excludeDarkCheck", "true");
      const parent = document.getElementById("container");
      if (parent) {
        parent.appendChild(backgroundContainer); // Appends the new background container to the parent
      }
    }

    let mediaContainer = document.getElementById("media-container"); // Searches for the existing media container
    if (!mediaContainer) { // If no media container exists, creates one
      mediaContainer = document.createElement("div");
      mediaContainer.id = "media-container";
      backgroundContainer.appendChild(mediaContainer); // Appends the new media container to the background container
    }

    mediaContainer = document.getElementById("media-container"); // Re-fetches the media container reference
    if (!mediaContainer) return; // Exits if the media container is not found

    mediaContainer.innerHTML = ""; // Clears any existing media content inside the container

    // Creates the appropriate media element (image or video) based on the background type
    const mediaElement =
      background.type === "video"
        ? document.createElement("video") // Creates a video element if the background type is video
        : document.createElement("img"); // Creates an image element if the background type is image

    mediaElement.src = URL.createObjectURL(background.blob); // Sets the source of the media element to the background blob URL
    mediaElement.classList.add("background"); // Adds a class to the media element for styling

    // If the media element is a video, sets additional attributes for autoplay, muted, and loop
    if (mediaElement instanceof HTMLVideoElement) {
      mediaElement.loop = true; // Ensures the video loops
      mediaElement.muted = true; // Mutes the video by default
      mediaElement.autoplay = true; // Automatically plays the video
    }

    mediaContainer.appendChild(mediaElement); // Appends the media element to the media container
  } catch (error) {
    console.error("Error loading background:", error); // Logs an error if there is any issue during background loading
  }
}
