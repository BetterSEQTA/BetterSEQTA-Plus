// Open the database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("MyDatabase", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("backgrounds", { keyPath: "id" });
    };
  });
};

// Read data from IndexedDB
const readData = async () => {
  const db = await openDB();
  const tx = db.transaction("backgrounds", "readonly");
  const store = tx.objectStore("backgrounds");
  const request = store.get("customBackground");

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Main function to run on page load
const main = async () => {
  try {
    const data = await readData();
    if (!data) {
      console.log("No data found in IndexedDB.");
      return;
    }

    const url = URL.createObjectURL(data.blob);
    const container = document.getElementById("media-container");

    if (data.type === "image") {
      const imgElement = document.createElement("img");
      imgElement.src = url;
      imgElement.alt = "Uploaded content";
      container.appendChild(imgElement);
    } else if (data.type === "video") {
      const videoElement = document.createElement("video");
      videoElement.src = url;
      videoElement.autoplay = true;
      videoElement.loop = true;
      videoElement.muted = true;
      container.appendChild(videoElement);
    }
  } catch (error) {
    console.error("An error occurred:", error);
  }
};

// Run the main function when the document is ready
document.addEventListener("DOMContentLoaded", main);
