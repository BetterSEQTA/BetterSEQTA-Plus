import browser from 'webextension-polyfill';
import base64ToBlob from './base64ToBlob';
import { openDatabase, writeData } from '@/interface/hooks/BackgroundDataLoader';
import { backgroundUpdates } from '@/interface/hooks/BackgroundUpdates';
import { loadBackground } from '@/seqta/ui/ImageBackgrounds';

const MIGRATION_STATE_KEY = 'background_migration_state';

interface MigrationState {
  lastProcessedId: string | null;
  total: number;
  processed: number;
  completed: boolean;
}

export const migrateBackgrounds = async (): Promise<void> => {
  console.info('Migrating backgrounds...');
  
  const savedState = localStorage.getItem(MIGRATION_STATE_KEY);
  const migrationState: MigrationState = savedState 
    ? JSON.parse(savedState)
    : { lastProcessedId: null, total: 0, processed: 0, completed: false };

  if (migrationState.completed) {
    console.info('Migration already completed');
    return;
  }
  
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    
    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      
      switch (event.data.type) {
        case 'GET_LAST_PROCESSED_ID':
          iframe.contentWindow?.postMessage({
            type: 'LAST_PROCESSED_ID',
            id: migrationState.lastProcessedId
          }, '*');
          break;

        case 'BACKGROUND_DATA':
          try {
            const { id, data, mediaType, total, processed, isSelected } = event.data.payload;
            const mimeType = mediaType === 'image' ? 'image/png' : 'video/mp4';
            const blob = base64ToBlob(data, mimeType);

            await storeBackground({
              id,
              blob,
              type: mediaType
            });

            if (isSelected) {
              localStorage.setItem('selectedBackground', id);
              await loadBackground();
            }

            migrationState.lastProcessedId = id;
            migrationState.total = total;
            migrationState.processed = processed;
            localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(migrationState));

            console.log(`Migrated background: ${id} (${processed}/${total})`);
          } catch (error) {
            console.error('Error handling background data:', error);
          }
          break;

        case 'MIGRATION_COMPLETE':
          console.info('Migration completed successfully');
          migrationState.completed = true;
          localStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(migrationState));
          window.removeEventListener('message', handleMessage);
          iframe.remove();
          backgroundUpdates.triggerUpdate();
          resolve();
          break;

        case 'MIGRATION_ERROR':
          console.error('Migration failed:', event.data.error);
          window.removeEventListener('message', handleMessage);
          iframe.remove();
          reject(new Error(event.data.error));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    const startPinging = () => {
      const pingInterval = setInterval(() => {
        iframe.contentWindow?.postMessage({ type: 'PING' }, '*');
      }, 500);

      const messageHandler = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow) {
          clearInterval(pingInterval);
          window.removeEventListener('message', messageHandler);
          iframe.contentWindow?.postMessage({ type: 'START_MIGRATION' }, '*');
        }
      };

      window.addEventListener('message', messageHandler);
    };
    
    iframe.src = browser.runtime.getURL('seqta/utils/migration/migrate.html');
    document.body.appendChild(iframe);
    startPinging();
  });
};

const storeBackground = async (data: {
  id: string;
  blob: Blob;
  type: 'image' | 'video';
}): Promise<void> => {
  try {
    await openDatabase();
    await writeData(data.id, data.type, data.blob);
  } catch (error) {
    console.error('Error storing background:', error);
    throw error;
  }
};