import { Background } from "../components/BackgroundSelector";

export const downloadPresetBackground = async (background: Background, onProgress: (progress: number) => void): Promise<Background> => {
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
export const openDB = () => {
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
export const writeData = async (fileId: string, type: string, blob: Blob) => {
  return new Promise((resolve, reject) => {
    openDB().then(async (db) => {
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
export const readAllData = async (): Promise<Background[]> => {
  const db = await openDB();
  const tx = db.transaction('backgrounds', 'readonly');
  const store = tx.objectStore('backgrounds');
  const request = store.getAll();

  return await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
