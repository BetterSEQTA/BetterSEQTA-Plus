// This goes in your migration.html's script
interface Data {
  id: string;
  blob: Blob;
  type: 'image' | 'video';
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data URL prefix
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

const getAllBackgrounds = async (): Promise<Data[]> => {
  const db = await openDB();
  const tx = db.transaction('backgrounds', 'readonly');
  const store = tx.objectStore('backgrounds');
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getSelectedBackground = (): string | null => {
  return localStorage.getItem('selectedBackground');
};

const startMigration = async () => {
  try {
    console.info('Starting background extraction...');
    let backgrounds: Data[];
    try {
      backgrounds = await getAllBackgrounds();
      if (!backgrounds || backgrounds.length === 0) {
        console.info('No backgrounds to migrate');
        window.parent.postMessage({ type: 'MIGRATION_COMPLETE' }, '*');
        return;
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError' && error.message.includes('object stores was not found')) {
        console.info('No backgrounds to migrate: object store not found');
        window.parent.postMessage({ type: 'MIGRATION_COMPLETE' }, '*');
        return;
      }
      console.error('Error fetching backgrounds:', error);
      throw new Error('Failed to fetch backgrounds');
    }
    const selectedBackground = getSelectedBackground();
    console.info(`Found ${backgrounds.length} backgrounds`);

    window.parent.postMessage({ type: 'GET_LAST_PROCESSED_ID' }, '*');

    const lastProcessedId = await new Promise<string | null>(resolve => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === 'LAST_PROCESSED_ID') {
          window.removeEventListener('message', handler);
          resolve(event.data.id);
        }
      };
      window.addEventListener('message', handler);
    });

    const remainingBackgrounds = lastProcessedId 
      ? backgrounds.slice(backgrounds.findIndex(b => b.id === lastProcessedId) + 1)
      : backgrounds;

    console.info(`Processing ${remainingBackgrounds.length} remaining backgrounds`);

    for (let i = 0; i < remainingBackgrounds.length; i++) {
      const background = remainingBackgrounds[i];
      const base64Data = await blobToBase64(background.blob);
      
      window.parent.postMessage({
        type: 'BACKGROUND_DATA',
        payload: {
          id: background.id,
          data: base64Data,
          mediaType: background.type,
          total: backgrounds.length,
          processed: i + 1,
          isSelected: background.id === selectedBackground
        }
      }, '*');

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    window.parent.postMessage({ type: 'MIGRATION_COMPLETE' }, '*');

  } catch (error: any) {
    console.error('Extraction failed:', error);
    window.parent.postMessage({
      type: 'MIGRATION_ERROR',
      error: error.message || 'Unknown error'
    }, '*');
  }
};

window.addEventListener('message', (event) => {
  switch (event.data.type) {
    case 'PING':
      window.parent.postMessage({ type: 'PONG' }, '*');
      break;
      
    case 'START_MIGRATION':
      startMigration();
      break;
  }
});