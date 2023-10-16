/* global chrome */

export async function appendBackgroundToUI() {
  console.log("Starting appendBackgroundToUI...");

  const parent = document.getElementById("container");

  // embed background.html
  const background = document.createElement("iframe");
  background.id = "background";
  background.classList.add("imageBackground");
  background.setAttribute("excludeDarkCheck", "true");
  background.src = chrome.runtime.getURL("backgrounds/background.html");
  parent.appendChild(background);

  /* const response = await new Promise((resolve, reject) => {
    console.log("Sending message to background script...");
    chrome.runtime.sendMessage({ type: "IndexedDB", action: "read", fileName: "customBackground" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error from background script:", chrome.runtime.lastError);
        return reject(chrome.runtime.lastError);
      }
      console.log("Received response from background script:", response);
      resolve(response);
    });
  });

  let data = response.data; // response.data is the image Data URL

  // Extract the pure base64 string from the Data URL
  const base64Marker = ";base64,";
  const base64Index = data.indexOf(base64Marker) + base64Marker.length;
  const base64 = data.substring(base64Index);

  let type = response.type; // response.type is the image type [ video | image ]

  if (base64) {
    console.log("Data exists, proceeding...");

    const mount = document.getElementById("container");

    // Convert base64 to ArrayBuffer
    console.log("Converting base64 to ArrayBuffer...");
    const byteCharacters = atob(base64);
    const byteNumbers = Array.from(byteCharacters).map(char => char.charCodeAt(0));
    const byteArray = new Uint8Array(byteNumbers);

    // Create blob
    console.log("Creating blob...");
    const blob = new Blob([byteArray], { type: type === "video" ? "video/mp4" : "image/jpeg" });

    // Create blob URL
    console.log("Creating blob URL...");
    const blobUrl = URL.createObjectURL(blob);

    let backgroundElement;

    if (type === "video") {
      console.log("Appending video element...");
      backgroundElement = document.createElement("video");
      backgroundElement.src = blobUrl;
      backgroundElement.autoplay = true;
      backgroundElement.loop = true;
      backgroundElement.muted = true;

      // Revoke blob URL to free memory
      backgroundElement.addEventListener("ended", () => {
        console.log("Video ended, revoking blob URL...");
        URL.revokeObjectURL(blobUrl);
      });
    } else {
      console.log("Appending image element...");
      backgroundElement = document.createElement("img");
      backgroundElement.src = blobUrl;
      backgroundElement.alt = "Custom Background";
      backgroundElement.classList.add("imageBackground");
    }

    console.log("Appending background element to the DOM...");
    mount.appendChild(backgroundElement);
  } else {
    console.warn("No data received. Background not appended.");
  } */
}
