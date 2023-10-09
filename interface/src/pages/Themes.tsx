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

const writeData = async (type: string, data: any) => {
  return new Promise((resolve, reject) => {
    openDB().then(async db => {
      const tx = db.transaction('backgrounds', 'readwrite');
      const store = tx.objectStore('backgrounds');
      const request = store.put({ id: 'customBackground', type, data });

      // Wait for the transaction to complete
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
    console.log(fileType);
  
    // Directly save the Blob object (file)
    await writeData(fileType, file);
    
    // For displaying purpose, you might still want to convert it to Data URL
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  useEffect(() => {
    (async () => {
      const data = await readData();
      if (data?.type === 'image') {
        const reader = new FileReader();
        reader.onload = () => {
          setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(data.data);
      } else if (data?.type === 'video') {
        const reader = new FileReader();
        reader.onload = () => {
          setVideoSrc(reader.result as string);
        };
        reader.readAsDataURL(data.data);
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