import { ChangeEvent, useEffect, useState } from "react";
import { downloadPresetBackground, openDB, readAllData, writeData } from "../hooks/BackgroundDataLoader";
import presetBackgrounds from "../assets/presetBackgrounds";
import "./BackgroundSelector.css";
import { disableTheme } from "../hooks/ThemeManagment";
import { DownloadProgressCircle } from "./backgroundSelector/DownloadProgressCircle";
import { BackgroundSwatch } from "./backgroundSelector/BackgroundSwatch";
import { BackgroundList } from "./backgroundSelector/BackgroundList";
import { FileUploader } from "./backgroundSelector/FileUploader";
import { RemoveButton } from "./backgroundSelector/RemoveButton";
import { useSettingsContext } from "../SettingsContext";

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

export default function BackgroundSelector({ selectedType, setSelectedType, isEditMode }: BackgroundSelectorProps) {
  const { setSettingsState } = useSettingsContext();
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(localStorage.getItem('selectedBackground'));
  const [downloadedPresetIds, setDownloadedPresetIds] = useState<string[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});

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
    setSettingsState(prev => ({ ...prev, animatedBackground: false }));
    disableTheme();
    setSelectedType('background');
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
    setSelectedType('background');
    disableTheme();
    setSelectedBackground(null);
    localStorage.removeItem('selectedBackground');
  };
  
  useEffect(() => {
    loadBackgrounds();
  }, []);

  return (
    <>
      <RemoveButton selectedBackground={selectedBackground} selectNoBackground={selectNoBackground} />

      <div className="relative">
        <h2 className="pb-2 text-lg font-bold">Images</h2>
        <div className="flex flex-wrap gap-4">
          <FileUploader handleFileChange={handleFileChange} />
          <BackgroundList
            backgrounds={backgrounds.filter(bg => bg.type === 'image')}
            selectBackground={selectBackground}
            isEditMode={isEditMode}
            deleteBackground={deleteBackground}
            selectedBackground={selectedBackground}
            selectedType={selectedType}
          />
          {/* Preset backgrounds handling (images) */}
          {presetBackgrounds
            .filter(bg => bg.type === 'image' && bg.isPreset && !downloadedPresetIds.includes(bg.id))
            .map(bg => (
              <div key={bg.id} onClick={() => handlePresetClick(bg)} className="relative w-16 h-16">
                {downloadProgress[bg.id] !== undefined && <DownloadProgressCircle progress={downloadProgress[bg.id]} />}
                <BackgroundSwatch
                  background={bg}
                  selectBackground={selectBackground}
                  isEditMode={isEditMode}
                  deleteBackground={deleteBackground}
                  selectedBackground={selectedBackground}
                  selectedType={selectedType}
                />
              </div>
          ))}
        </div>

        <h2 className="py-2 text-lg font-bold">Videos</h2>
        <div className="flex flex-wrap gap-4">
          <FileUploader handleFileChange={handleFileChange} />
          <BackgroundList
            backgrounds={backgrounds.filter(bg => bg.type === 'video')}
            selectBackground={selectBackground}
            isEditMode={isEditMode}
            deleteBackground={deleteBackground}
            selectedBackground={selectedBackground}
            selectedType={selectedType}
          />
          {/* Preset backgrounds handling (videos) */}
          {presetBackgrounds
            .filter(bg => bg.type === 'video' && bg.isPreset && !downloadedPresetIds.includes(bg.id))
            .map(bg => (
              <div key={bg.id} onClick={() => handlePresetClick(bg)} className="relative w-16 h-16">
                {downloadProgress[bg.id] !== undefined && <DownloadProgressCircle progress={downloadProgress[bg.id]} />}
                <BackgroundSwatch
                  background={bg}
                  selectBackground={selectBackground}
                  isEditMode={isEditMode}
                  deleteBackground={deleteBackground}
                  selectedBackground={selectedBackground}
                  selectedType={selectedType}
                />
              </div>
          ))}
        </div>
      </div>
    </>
  );
}