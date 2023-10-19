import { useState, useEffect, ChangeEvent, FC } from 'react';
import './Themes.css';

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
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

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

  const deleteBackground = async (fileId: string): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction('backgrounds', 'readwrite');
    const store = tx.objectStore('backgrounds');
    store.delete(fileId);
    setBackgrounds(prev => prev.filter(bg => bg.id !== fileId));
  };

  const selectNoBackground = (): void => {
    setSelectedBackground(null);
    localStorage.removeItem('selectedBackground');
  };  

  useEffect(() => {
    loadBackgrounds();
  }, []);

  return (
  <div>
    <button disabled={selectedBackground == null ? true : false} className={`w-full px-4 py-2 mb-4 text-white transition ${selectedBackground == null ? 'bg-zinc-900' : 'bg-blue-500'} rounded`} onClick={() => selectNoBackground()}>
    {selectedBackground == null ? 'No Background' : 'Remove Background'}
    </button>
    <div className="relative">
      <button className="absolute top-0 right-0 p-2 text-[0.8rem] text-blue-500" onClick={() => setIsEditMode(!isEditMode)}>
        {isEditMode ? 'Done' : 'Edit'}
      </button>
      <h2 className="pb-2 text-lg font-bold">Images</h2>
      <div className="flex flex-wrap gap-4">
        {/* Image uploader swatch */}
        <div className="relative w-16 h-16 overflow-hidden transition rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <div className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400 transition font-IconFamily hover:text-gray-500">
            {/*  Plus icon */}
            
          </div>
          <input type="file" accept='image/*, video/*' onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        {backgrounds.filter(bg => bg.type === 'image').map(bg => (
          <div key={bg.id}
            onClick={() => selectBackground(bg.id)} 
            className={`relative w-16 h-16 cursor-pointer rounded-xl transition ring ring-white ${isEditMode ? 'animate-shake' : ''} ${selectedBackground === bg.id ? 'ring-2' : 'ring-0'}`}>
            {isEditMode && (
              <div className="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
                  onClick={() => deleteBackground(bg.id)}>
                <div className="w-4 h-0.5 bg-white"></div>
              </div>
            )}
            <img className="object-cover w-full h-full rounded-xl" src={bg.url} alt="swatch" />
          </div>
        ))}
      </div>

      <h2 className="py-2 text-lg font-bold">Videos</h2>
      <div className="flex flex-wrap gap-4">
        {/* Video uploader swatch */}
        <div className="relative w-16 h-16 overflow-hidden transition rounded-xl bg-zinc-100 dark:bg-zinc-900">
          <div className="flex items-center justify-center w-full h-full text-3xl font-bold text-gray-400 transition font-IconFamily hover:text-gray-500">
            {/*  Plus icon */}
            
          </div>
          <input type="file" accept='image/*, video/*' onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        {backgrounds.filter(bg => bg.type === 'video').map(bg => (
          <div key={bg.id} onClick={() => selectBackground(bg.id)} className={`relative w-16 h-16 cursor-pointer rounded-xl transition ring ring-white ${isEditMode ? 'animate-shake' : ''} ${selectedBackground === bg.id ? 'ring-2' : 'ring-0'}`}>
            {isEditMode && (
              <div className="absolute top-0 right-0 z-10 flex w-6 h-6 p-2 text-white translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full place-items-center"
                  onClick={() => deleteBackground(bg.id)}>
                <div className="w-4 h-0.5 bg-white"></div>
              </div>
            )}
            <video muted loop autoPlay src={bg.url} className="object-cover w-full h-full rounded-xl" />
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
  </div>
  );
};

export default Themes;
