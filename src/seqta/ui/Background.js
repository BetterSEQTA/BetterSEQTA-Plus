/* global chrome */

export async function appendBackgroundToUI() {
  try {
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "IndexedDB" }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(response);
      });
    });
    console.log("response:", response);
  } catch (error) {
    console.log("Error:", error);
  }
  

  const mount = document.getElementById("container");
  console.log("Starting to append background");
  let data;
  const response = await chrome.runtime.sendMessage({ type: "IndexedDB" });
  data = response;
  const imgElement = document.createElement("img");
  imgElement.src = data;
  imgElement.alt = "Uploaded Image";
  imgElement.classList.add("imageBackground");
  mount.appendChild(imgElement);

/*   if (data) {
    continue
  } else if (data?.type === "video") {
    // Handle video
  } */
}

appendBackgroundToUI();
