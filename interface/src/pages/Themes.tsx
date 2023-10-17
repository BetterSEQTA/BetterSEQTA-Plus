import { useState, useEffect, ChangeEvent, FC } from 'react';

// Custom Types and Interfaces
interface Background {
  id: string;
  type: string;
  blob: Blob;
  url?: string;
}

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

const writeData = async (fileId: string, type: string, blob: Blob) => {
  return new Promise((resolve, reject) => {
    openDB().then(async db => {
      const tx = db.transaction('backgrounds', 'readwrite');
      const store = tx.objectStore('backgrounds');
      const request = store.put({ id: fileId, type, blob });

      await new Promise((res, rej) => {
        tx.oncomplete = () => res(request.result);
        tx.onerror = () => rej(tx.error);
      }).then(resolve, reject);

    }).catch(reject);
  });
};

const readAllData = async (): Promise<Background[]> => {
  const db = await openDB();
  const tx = db.transaction('backgrounds', 'readonly');
  const store = tx.objectStore('backgrounds');
  const request = store.getAll();

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const Themes: FC = () => {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(localStorage.getItem('selectedBackground'));

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileId = `${Date.now()}-${file.name}`;
    const fileType = file.type.split('/')[0];
    const blob = new Blob([file], { type: file.type });

    await writeData(fileId, fileType, blob);
    setBackgrounds(prev => [...prev, { id: fileId, type: fileType, blob, url: URL.createObjectURL(blob) }]);
  };

  const loadBackgrounds = async (): Promise<void> => {
    const data = await readAllData();
    const dataWithUrls = data.map(bg => ({ ...bg, url: URL.createObjectURL(bg.blob) }));
    setBackgrounds(dataWithUrls);
  };

  const selectBackground = (fileId: string): void => {
    setSelectedBackground(fileId);
    localStorage.setItem('selectedBackground', fileId);
  };

  useEffect(() => {
    loadBackgrounds();
  }, []);

  return (
  <div>
    <h2>Upload a Background</h2>
    <input type="file" onChange={handleFileChange} />

    <h2>Images</h2>
    <div className="flex flex-wrap gap-4">
      {backgrounds.filter(bg => bg.type === 'image').map(bg => (
        <div key={bg.id} onClick={() => selectBackground(bg.id)} className={`w-16 h-16 rounded-lg overflow-hidden transition ring ring-white ${selectedBackground === bg.id ? 'ring-4' : 'ring-0'}`}>
          <img className="object-cover w-full h-full" src={bg.url} alt="swatch" />
        </div>
      ))}
    </div>

    <h2>Videos</h2>
    <div className="flex flex-wrap gap-4">
      {backgrounds.filter(bg => bg.type === 'video').map(bg => (
        <div key={bg.id} onClick={() => selectBackground(bg.id)} className={`w-16 h-16 rounded-lg overflow-hidden transition ring ring-white ${selectedBackground === bg.id ? 'ring-4' : 'ring-0'}`}>
          <video muted loop autoPlay src={bg.url} className="object-cover w-full h-full" />
        </div>
      ))}
    </div>
    
    { /* Preview section */ }
    <div className="hidden">
      {backgrounds.filter(bg => bg.id === selectedBackground).map(bg => (
        bg.type === 'image' ? 
        <img key={bg.id} src={URL.createObjectURL(bg.blob)} alt="Selected Background" /> :
        <video key={bg.id} src={URL.createObjectURL(bg.blob)} autoPlay loop muted />
      ))}
    </div>
  </div>
  );
};

export default Themes;
