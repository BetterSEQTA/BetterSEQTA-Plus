/* // global chrome */
/* function isValidBase64(str) {
  const len = str.length;
  if (len % 4 !== 0) {
    return false;
  }
  for (let i = 0; i < len; i++) {
    if (!(/[A-Za-z0-9+/=]/.test(str[i]))) {
      return false;
    }
  }
  return true;
}

function base64ToArrayBuffer(base64) {
  console.log(base64);
  if (!isValidBase64(base64)) {
    console.error("Invalid base64 string");
    return null;
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
} */

export async function appendBackgroundToUI() {
  /* const response = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "IndexedDB", action: "read", fileName: "customBackground" }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(response);
    });
  });
  console.log("response:", response);

  let data = response.data; // response.data is the image base64 string
  let type = response.type; // response.type is the image type [ video | image ]
  
  if (data) {
    // check if it is video from its base64 string
    const mount = document.getElementById("container");
    console.log("Starting to append background");
    let backgroundElement;
    if (type === "video") {
      console.log("Data type:", typeof data);
      console.log("Data instance:", data instanceof Blob);

      if (data instanceof Blob) {
        console.log("Blob size:", data.size);
        console.log("Blob type:", data.type);
      }    

      console.log("Starting blob.");
      const blob = new Blob([new Uint8Array(response.data)]);  // Adjust the MIME type accordingly
      console.log("Made blob.");
      const blobUrl = URL.createObjectURL(blob);
      console.log(blobUrl);
      backgroundElement = document.createElement("video");
      backgroundElement.src = blobUrl;
      backgroundElement.autoplay = true;
      backgroundElement.loop = true;
      backgroundElement.muted = true;
      console.log(backgroundElement);
      mount.appendChild(backgroundElement);
      // Remember to revoke the blob URL to avoid memory leaks
      backgroundElement.addEventListener("ended", () => {
        URL.revokeObjectURL(blobUrl);
      });
    } else {
      backgroundElement = document.createElement("img");
      backgroundElement.src = data;
      backgroundElement.alt = "Custom Background";
      backgroundElement.classList.add("imageBackground");
      mount.appendChild(backgroundElement);
    }
  } */
}