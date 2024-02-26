import { ChangeEvent, memo, useEffect, useState } from "react";
import { downloadPresetBackground, openDB, readAllData, writeData } from "../hooks/BackgroundDataLoader";
import presetBackgrounds from "../assets/presetBackgrounds";
import "./BackgroundSelector.css";
import { disableTheme } from "../hooks/ThemeManagment";
import browser from "webextension-polyfill";

// Custom Types and Interfaces
export interface Background {
  id: string;
  type: string;
  blob: Blob;
  url?: string;
  previewUrl?: string;
  isPreset?: boolean;
  isDownloaded?: boolean;
}

interface BackgroundSelectorProps {
  selectedType: "background" | "theme";
  setSelectedType: (type: "background" | "theme") => void;
  isEditMode: boolean;
}

async function GetTheme() {
  return localStorage.getItem('selectedBackground');
}

async function SetTheme(theme: string) {
  localStorage.setItem('selectedBackground', theme);
  await browser.storage.local.set({ theme });
}

function BackgroundSelector({ selectedType, setSelectedType, isEditMode }: BackgroundSelectorProps) {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string | null>();
  const [downloadedPresetIds, setDownloadedPresetIds] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

  const [BackgroundsBlocked, setBackgroundsBlocked] = useState<boolean>(false);

  useEffect(() => {
    GetTheme().then((theme) => {
      setSelectedBackground(theme);
    });
  }, []);

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
      // Check if indexed DB is accessible or whether cross site cookies blocks it
      try {
        await openDB();
      } catch (error) {
        // @ts-expect-error - Brave is not in the navigator type (unless you are actually using brave browser, then it is there)
        if (navigator.brave && await navigator.brave.isBrave() || false) {
          console.log('[BetterSEQTA+] Brave browser is blocking access to IndexedDB. Please disable the "Cross-site cookies blocked" setting in the Shields panel. (or you can just disable brave shields for SEQTA)');
          setBackgroundsBlocked(true);
          return;
        }
        alert("[BetterSEQTA+] IndexedDB is not accessible. Please check your browser settings (It's probably cross-site cookies that are blocked).");
        return;
      }

      // Check if already exists in IndexedDB or is currently being downloaded
      const existingBackgrounds = await readAllData();
      const alreadyExists = existingBackgrounds.some(ebg => ebg.id === bg.id) || downloadProgress[bg.id] !== undefined;
    
      if (!alreadyExists) {
        setDownloadProgress(prev => ({ ...prev, [bg.id]: 0 }));
        const downloadedBg = await downloadPresetBackground(bg, progress => {
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
    if (selectedType == 'background' && selectedBackground == fileId) {
      selectNoBackground();
      return;
    }

    disableTheme();
    setSelectedType('background');
    setSelectedBackground(fileId);
    SetTheme(fileId);
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
    setSelectedType('background');
    disableTheme();
    setSelectedBackground(null);
    SetTheme('');
  };

  const calcCircumference = (radius: number) => 2 * Math.PI * radius;
  
  useEffect(() => {
    loadBackgrounds();
  }, []);

  return (
    <>
    <button
      disabled={selectedBackground == null && selectedType != 'theme' ? true : false}
      className={`w-full px-4 py-2 mb-4 dark:text-white transition ${selectedBackground == null && selectedType != 'theme' ? 'dark:bg-zinc-900 bg-zinc-100' : 'bg-blue-500 text-white'} rounded`} onClick={() => selectNoBackground()}>
    {selectedBackground == null && selectedType != 'theme' ? 'No Background' : 'Remove Background'}
    </button>

    {BackgroundsBlocked && (
      <div className="p-4 mb-4 text-red-600 bg-red-100 rounded-md dark:text-red-300 dark:bg-red-500 dark:bg-opacity-20">
        <h2 className="mb-2 text-lg font-bold">File Storage Blocked</h2>
        <p>Brave browser is blocking access to IndexedDB. Please disable the "Cross-site cookies blocked" setting in the Shields panel. (or you can just disable brave shields for SEQTA)</p>
        <img src="https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/brave.png" alt="Brave browser logo" className="w-1/2 mt-4" />
      </div>
    )}

    <div className="relative">
      <h2 className="pb-2 text-lg font-bold">Background Images</h2>
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
            className={`relative w-16 h-16 cursor-pointer rounded-xl transition ring dark:ring-white ring-zinc-300 ${isEditMode ? 'animate-shake' : ''} ${selectedBackground === bg.id && selectedType === "background" ? 'dark:ring-2 ring-4' : 'ring-0'}`}>
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
          <button key={bg.id}
            onClick={() => handlePresetClick(bg)}
            className={`relative w-16 h-16 transition cursor-pointer rounded-xl duration-300 ${ isEditMode ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}>
            {bg.isPreset && downloadProgress[bg.id] !== undefined && (
              <div className="absolute top-0 left-0 z-20 flex items-center justify-center w-full h-full">
                <svg className="w-full h-full text-zinc-100 dark:text-zinc-700" viewBox="0 0 36 36">
                  <circle stroke="currentColor" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset="0" transform="rotate(-90 18 18)"></circle>
                  <circle stroke="#3B82F6" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset={`${calcCircumference(14) * (1 - (downloadProgress[bg.id] / 100))}`} transform="rotate(-90 18 18)"></circle>
                </svg>
              </div>
            )}
            <div className={`relative transition top-0 z-10 flex justify-center w-full h-full text-white rounded-xl group place-items-center ${downloadProgress[bg.id] === undefined ? 'hover:bg-black/20' : ''}`}>
              <span className="absolute z-10 text-3xl transition opacity-0 font-IconFamily group-hover:opacity-100">
                {downloadProgress[bg.id] === undefined ? '' : ''}
              </span>
            </div>
            <img 
              className="absolute top-0 object-cover w-full h-full rounded-xl" 
              src={bg.isPreset ? bg.previewUrl : bg.url}  // Use preview for preset backgrounds
              alt="swatch" />
          </button>
        ))}
      </div>

      <h2 className="py-2 text-lg font-bold">Background Videos</h2>
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
          <div key={bg.id} onClick={() => selectBackground(bg.id)} className={`relative w-16 h-16 cursor-pointer rounded-xl transition ring dark:ring-white ring-zinc-300 ${isEditMode ? 'animate-shake' : ''} ${selectedBackground === bg.id && selectedType === "background" ? 'dark:ring-2 ring-4' : 'ring-0'}`}>
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
            className={`relative w-16 h-16 transition cursor-pointer rounded-xl duration-300 ${ isEditMode ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}>
            {bg.isPreset && downloadProgress[bg.id] !== undefined && (
              <div className="absolute top-0 left-0 z-20 flex items-center justify-center w-full h-full">
                <svg className="w-full h-full text-zinc-100 dark:text-zinc-700" viewBox="0 0 36 36">
                  <circle stroke="currentColor" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset="0" transform="rotate(-90 18 18)"></circle>
                  <circle stroke="#3B82F6" fill="none" strokeWidth="4" strokeLinecap="round" cx="18" cy="18" r="10" strokeDasharray={`${calcCircumference(14)} ${calcCircumference(14)}`} strokeDashoffset={`${calcCircumference(14) * (1 - (downloadProgress[bg.id] / 100))}`} transform="rotate(-90 18 18)"></circle>
                </svg>
              </div>
            )}
            <div className={`relative transition top-0 z-10 flex justify-center w-full h-full text-white rounded-xl group place-items-center ${downloadProgress[bg.id] === undefined ? 'hover:bg-black/20' : ''}`}>
              <span className="absolute z-10 text-3xl transition opacity-0 font-IconFamily group-hover:opacity-100">
                {downloadProgress[bg.id] === undefined ? '' : ''}
              </span>
            </div>
            <video muted loop autoPlay src={bg.isPreset ? bg.previewUrl : bg.url} className="absolute top-0 object-cover w-full h-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

export default memo(BackgroundSelector);