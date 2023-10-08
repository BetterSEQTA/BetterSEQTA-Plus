/* global chrome */
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
  const response = await new Promise((resolve, reject) => {
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
      /* const arrayBuffer = base64ToArrayBuffer(data);
      const blob = new Blob([arrayBuffer], { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);
      console.log("blobUrl:", blobUrl); */

      backgroundElement = document.createElement("video");
      backgroundElement.src = data;
      backgroundElement.autoplay = true;
      backgroundElement.loop = true;
      backgroundElement.muted = true;
      backgroundElement.classList.add("imageBackground");
      mount.appendChild(backgroundElement);

      const videoElement = document.getElementsByClassName("imageBackground")[0];
      setTimeout(() => {
        videoElement.play();
      }, 1000);
    } else {
      backgroundElement = document.createElement("img");
      backgroundElement.src = data;
      backgroundElement.alt = "Custom Background";
      backgroundElement.classList.add("imageBackground");
      mount.appendChild(backgroundElement);
    }
  }
}

appendBackgroundToUI();
