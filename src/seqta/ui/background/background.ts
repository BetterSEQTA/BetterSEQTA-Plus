interface Data {
  blob: Blob;
  type: 'image' | 'video';
}

interface DatabaseEventTarget extends EventTarget {
  result: IDBDatabase;
}

interface DatabaseEvent extends Event {
  target: DatabaseEventTarget;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      // @ts-expect-error - The event type is not recognized by TypeScript
      event?.target?.result.createObjectStore('backgrounds', { keyPath: 'id' });
    };
  });
};

const readData = async (): Promise<Data | null> => {
  const selectedBackground = localStorage.getItem('selectedBackground');

  //const selectedBackground = localStorage.getItem('selectedBackground');
  if (!selectedBackground || selectedBackground === '') {
    return null;
  }

  const db = await openDB();
  const tx = db.transaction('backgrounds', 'readonly');
  const store = tx.objectStore('backgrounds');
  const request = store.get(selectedBackground);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as Data);
    request.onerror = () => reject(request.error);
  });
};

const updateBackground = async (): Promise<void> => {
  try {
    const data = await readData();
    if (!data) {
      const container = document.getElementById('media-container');
      const currentMedia = container?.querySelector('.current-media');
      if (currentMedia) {
        currentMedia.remove();
      }
      return;
    }

    const url = URL.createObjectURL(data.blob);
    const container = document.getElementById('media-container');

    // Create new element and set properties
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
    const oldElement = container?.querySelector('.current-media');
    if (oldElement) {
      oldElement.classList.remove('current-media');
      oldElement.classList.add('old-media');
    }

    // Add the new element and mark it as current
    newElement?.classList.add('current-media');
    container?.appendChild(newElement as Node);

    // Delay removal of old element
    setTimeout(() => {
      const oldMedia = container?.querySelector('.old-media');
      if (oldMedia) {
        oldMedia.remove();
      }
    }, 100); // 0.1 second delay
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

// Main function to run on page load
const main = async (): Promise<void> => {
  await updateBackground();

  // Listen for changes to local storage
  window.addEventListener('storage', async (event) => {
    if (event.key === 'selectedBackground') {
      await updateBackground();
    }
  });
};

// Run the main function when the document is ready
document.addEventListener('DOMContentLoaded', main);
