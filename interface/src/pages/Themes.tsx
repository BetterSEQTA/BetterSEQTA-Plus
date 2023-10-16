import React, { useState, useEffect } from 'react';

// IndexedDB utility functions
const openDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore('backgrounds', { keyPath: 'id' });
    };
  });
};

const writeData = async (type: string, blob: Blob) => {
  return new Promise((resolve, reject) => {
    openDB().then(async db => {
      const tx = db.transaction('backgrounds', 'readwrite');
      const store = tx.objectStore('backgrounds');
      const request = store.put({ id: 'customBackground', type, blob });

      await new Promise((res, rej) => {
        tx.oncomplete = () => res(request.result);
        tx.onerror = () => rej(tx.error);
      }).then(resolve, reject);

    }).catch(reject);
  });
};

const readData = async () => {
  const db = await openDB();
  const tx = db.transaction('backgrounds', 'readonly');
  const store = tx.objectStore('backgrounds');
  const request = store.get('customBackground');

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const Themes: React.FC = () => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type.split('/')[0];
    const blob = new Blob([file], { type: file.type });

    // Save blob to IndexedDB
    await writeData(fileType, blob);

    // For displaying purpose
    const url = URL.createObjectURL(blob);
    if (fileType === 'image') {
      setVideoSrc(null);
      setImageSrc(url);
    } else if (fileType === 'video') {
      setImageSrc(null);
      setVideoSrc(url);
    }
  };

  useEffect(() => {
    (async () => {
      const data = await readData();
      const url = URL.createObjectURL(data.blob);
      if (data?.type === 'image') {
        setImageSrc(url);
      } else if (data?.type === 'video') {
        setVideoSrc(url);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col overflow-y-scroll divide-y divide-zinc-100/50 dark:divide-zinc-700/50">
      <div>
        <h2 className="text-lg font-bold">Custom Background</h2>
      </div>

      <input type="file" onChange={handleFileChange} />
      {imageSrc && <img src={imageSrc} alt="Uploaded content" />}
      {videoSrc && <video src={videoSrc} autoPlay loop muted />}

      <div>
        <h2 className="text-lg font-bold">Themes</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 py-4">
        <button className="flex flex-col items-center justify-center w-full h-32 rounded-md bg-zinc-100 dark:bg-zinc-700">
          <h2 className="text-lg font-bold">Light</h2>
        </button>
        <button className="flex flex-col items-center justify-center w-full h-32 rounded-md bg-zinc-800 dark:bg-zinc-600">
          <h2 className="text-lg font-bold">Dark</h2>
        </button>
      </div>
    </div>
  );
};

export default Themes;
