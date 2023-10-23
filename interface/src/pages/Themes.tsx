import { useState, useEffect, ChangeEvent, FC } from 'react';
import './Themes.css';

// Custom Types and Interfaces
interface Background {
  id: string;
  type: string;
  blob: Blob;
  url?: string;
  previewUrl?: string;  // New field
  isPreset?: boolean;
  isDownloaded?: boolean;
}

const downloadPresetBackground = async (background: Background, onProgress: (progress: number) => void): Promise<Background> => {
  const response = await fetch(background.url as string);
  
  const totalLength = +response.headers.get('Content-Length')!;
  let receivedLength = 0;
  
  const reader = response.body?.getReader();
  const chunks = [];
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader!.read();
    
    if (done) break;

    chunks.push(value!);
    receivedLength += value!.length;

    onProgress(Math.ceil(receivedLength / totalLength * 100));
  }

  const blob = new Blob(chunks);
  await writeData(background.id, background.type, blob);
  
  return {
    id: background.id,
    type: background.type,
    blob,
    url: URL.createObjectURL(blob),
  };
};

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
  const [downloadedPresetIds, setDownloadedPresetIds] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);


  const presetBackgrounds = [
    { 
      id: 'preset-1', 
      type: 'image', 
      url: 'https://images.unsplash.com/photo-1697228428285-8c442346434a?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 
      previewUrl: 'https://images.unsplash.com/photo-1697228428285-8c442346434a?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 
      isPreset: true 
    },
    { 
      id: 'preset-2', 
      type: 'image', 
      url: 'https://images.unsplash.com/photo-1697359774044-35aa12ab7c91?auto=format&fit=crop&q=80&w=2375&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 
      previewUrl: 'https://images.unsplash.com/photo-1697359774044-35aa12ab7c91?auto=format&fit=crop&q=80&w=2375&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 
      isPreset: true 
    },
    // ... more preset backgrounds
  ];
  
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
  
    // Update downloaded preset IDs
    setDownloadedPresetIds(data.map(bg => bg.id));
    
    setBackgrounds(dataWithUrls);
  };  

const handlePresetClick = async (bg: Background): Promise<void> => {
  if (bg.isPreset) {
    // Check if already exists in IndexedDB or is currently being downloaded
    const existingBackgrounds = await readAllData();
    const alreadyExists = existingBackgrounds.some(ebg => ebg.id === bg.id) || downloadProgress[bg.id] !== undefined;
  
    if (!alreadyExists) {
      setDownloadProgress(prev => ({ ...prev, [bg.id]: 0 }));
      const downloadedBg = await downloadPresetBackground(bg, progress => {
        console.log(`${bg}, ${progress}`);
        setDownloadProgress(prev => ({ ...prev, [bg.id]: progress }));
      });
      setDownloadProgress(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [bg.id]: _, ...rest } = prev;
        return rest;
      });
      await writeData(downloadedBg.id, downloadedBg.type, downloadedBg.blob);
      setBackgrounds(prev => [...prev, downloadedBg]);
      setDownloadedPresetIds(prev => [...prev, downloadedBg.id]);
    }
    selectBackground(bg.id);
  }
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
  
    // Check if the background being deleted is currently selected
    if (fileId === selectedBackground) {
      selectNoBackground();  // Disable the current background
    }
  };  

  const selectNoBackground = (): void => {
    setSelectedBackground(null);
    localStorage.removeItem('selectedBackground');
  };

  const calcCircumference = (radius: number) => 2 * Math.PI * radius;
  
  useEffect(() => {
    loadBackgrounds();
  }, []);

  return (
  <div>
    <button disabled={selectedBackground == null ? true : false} className={`w-full px-4 py-2 mb-4 dark:text-white transition ${selectedBackground == null ? 'dark:bg-zinc-900 bg-zinc-100' : 'bg-blue-500 text-white'} rounded`} onClick={() => selectNoBackground()}>
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
        {backgrounds.concat(presetBackgrounds as Background[]).filter(bg => bg.type === 'image' && bg.isPreset && !bg.isDownloaded && !downloadedPresetIds.includes(bg.id)).map(bg => (
          <div key={bg.id}
            onClick={() => handlePresetClick(bg)}
            className='relative w-16 h-16 transition cursor-pointer rounded-xl'>
            {bg.isPreset && downloadProgress[bg.id] !== undefined && (
              <div className="absolute top-0 left-0 z-20 flex items-center justify-center w-full h-full">
                <svg className="w-full h-full text-zinc-100 dark:text-zinc-700" viewBox="0 0 36 36">
                  <circle stroke="currentColor" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset="0" transform="rotate(-90 18 18)"></circle>
                  <circle stroke="#3B82F6" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset={`${calcCircumference(14) * (1 - (downloadProgress[bg.id] / 100))}`} transform="rotate(-90 18 18)"></circle>
                </svg>
              </div>
            )}
            <div className="relative top-0 z-10 flex justify-center w-full h-full text-white rounded-xl group place-items-center">
              <span className="absolute z-10 text-3xl transition opacity-0 font-IconFamily group-hover:opacity-100">
                {downloadProgress[bg.id] === undefined ? '' : ''}
              </span>
            </div>
            <img 
              className="absolute top-0 object-cover w-full h-full rounded-xl" 
              src={bg.isPreset ? bg.previewUrl : bg.url}  // Use preview for preset backgrounds
              alt="swatch" />
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
        {backgrounds.concat(presetBackgrounds as Background[]).filter(bg => bg.type === 'video' && bg.isPreset && !bg.isDownloaded && !downloadedPresetIds.includes(bg.id)).map(bg => (
          <div key={bg.id}
            onClick={() => handlePresetClick(bg)}
            className='relative w-16 h-16 transition cursor-pointer rounded-xl'>
            {bg.isPreset && downloadProgress[bg.id] !== undefined && (
              <div className="absolute top-0 left-0 z-20 flex items-center justify-center w-full h-full">
                <svg className="w-full h-full text-zinc-100 dark:text-zinc-700" viewBox="0 0 36 36">
                  <circle stroke="currentColor" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset="0" transform="rotate(-90 18 18)"></circle>
                  <circle stroke="#3B82F6" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset={`${calcCircumference(14) * (1 - (downloadProgress[bg.id] / 100))}`} transform="rotate(-90 18 18)"></circle>
                </svg>
              </div>
            )}
            <div className="relative top-0 z-10 flex justify-center w-full h-full text-white rounded-xl group place-items-center">
              <span className="absolute z-10 text-3xl transition opacity-0 font-IconFamily group-hover:opacity-100">
                {downloadProgress[bg.id] === undefined ? '' : ''}
              </span>
            </div>
            <video muted loop autoPlay src={bg.isPreset ? bg.previewUrl : bg.url} className="absolute top-0 object-cover w-full h-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  </div>
  );
};

export default Themes;
