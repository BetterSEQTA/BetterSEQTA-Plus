import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

interface BackgroundDB extends DBSchema {
  backgrounds: {
    key: string;
    value: {
      id: string;
      type: string;
      blob: Blob;
    };
  };
}

let db: IDBPDatabase<BackgroundDB> | null = null;

export async function openDatabase(): Promise<IDBPDatabase<BackgroundDB>> {
  if (db) return db;

  db = await openDB<BackgroundDB>('BackgroundDB', 1, {
    upgrade(db: IDBPDatabase<BackgroundDB>) {
      db.createObjectStore('backgrounds', { keyPath: 'id' });
    },
  });

  return db;
}

export async function readAllData(): Promise<Array<{ id: string; type: string; blob: Blob }>> {
  const db = await openDatabase();
  return db.getAll('backgrounds');
}

export async function writeData(id: string, type: string, blob: Blob): Promise<void> {
  const db = await openDatabase();
  await db.put('backgrounds', { id, type, blob });
}

export async function deleteData(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete('backgrounds', id);
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  await db.clear('backgrounds');
}

export async function getDataById(id: string): Promise<{ id: string; type: string; blob: Blob } | undefined> {
  const db = await openDatabase();
  return db.get('backgrounds', id);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Helper function to check if IndexedDB is supported
export function isIndexedDBSupported(): boolean {
  return 'indexedDB' in window;
}

// Helper function to check if there's enough storage space
export async function hasEnoughStorageSpace(requiredSpace: number): Promise<boolean> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined && usage !== undefined) {
      return (quota - usage) > requiredSpace;
    }
  }
  // If we can't determine, assume there's enough space
  return true;
}