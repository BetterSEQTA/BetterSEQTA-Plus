Open the database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('backgrounds', { keyPath: 'id' });
    };
  });
};

Modified Read Data from IndexedDB
const readData = async () => {
  const selectedBackground = localStorage.getItem('selectedBackground');
  if (!selectedBackground) {
    console.log('No selected background in local storage.');
    return null;
  }

  const db = await openDB();
  const tx = db.transaction('backgrounds', 'readonly');
  const store = tx.objectStore('backgrounds');
  const request = store.get(selectedBackground);

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const updateBackground = async () => {
  try {
    const data = await readData();
    if (!data) {
      console.log('No data found in IndexedDB.');

      const container = document.getElementById('media-container');
      const currentMedia = container.querySelector('.current-media');
      if (currentMedia) {
        currentMedia.remove();
      }
      return;
    }

    const url = URL.createObjectURL(data.blob);
    const container = document.getElementById('media-container');

    Create new element and set properties
    let newElement;
    if (data.type === 'image') {
      newElement = document.createElement('img');
      newElement.src = url;
      newElement.alt = 'Uploaded content';
    } else if (data.type === 'video') {
      newElement = document.createElement('video');
      newElement.src = url;
      newElement.autoplay = true;
      newElement.loop = true;
      newElement.muted = true;
    }

    // Mark the old element for removal
    const oldElement = container.querySelector('.current-media');
    if (oldElement) {
      oldElement.classList.remove('current-media');
      oldElement.classList.add('old-media');
    }

    // Add the new element and mark it as current
    newElement.classList.add('current-media');
    container.appendChild(newElement);

    Delay removal of old element
    setTimeout(() => {
      const oldMedia = container.querySelector('.old-media');
      if (oldMedia) {
        oldMedia.remove();
      }
    }, 100); // 0.1 second delay
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

Main function to run on page load
const main = async () => {
  await updateBackground();  // Initial background update

  Listen for changes to local storage
  window.addEventListener('storage', async (event) => {
    if (event.key === 'selectedBackground') {
      await updateBackground();  // Update background if 'selectedBackground' changes
    }
  });
};

Run the main function when the document is ready
document.addEventListener('DOMContentLoaded', main);
