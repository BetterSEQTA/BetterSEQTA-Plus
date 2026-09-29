type BackgroundRecord = { id: string; type: string; blob: Blob };

const DB_NAME = "BackgroundDB";
const STORE = "backgrounds";

let dbPromise: Promise<IDBDatabase> | null = null;

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, 1);
      open.onerror = () => {
        dbPromise = null;
        reject(open.error);
      };
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE)) {
          open.result.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      open.onsuccess = () => resolve(open.result);
    });
  }
  return dbPromise;
}

export async function readAllData(): Promise<BackgroundRecord[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readonly");
  const items = await req(tx.objectStore(STORE).getAll());
  await txDone(tx);
  return items;
}

export async function writeData(
  id: string,
  type: string,
  blob: Blob,
): Promise<void> {
  const record = { id, type, blob };
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  try {
    await req(store.keyPath ? store.put(record) : store.put(record, id));
    await txDone(tx);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to save background: ${detail}`);
  }
}

export async function deleteData(id: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readwrite");
  await req(tx.objectStore(STORE).delete(id));
  await txDone(tx);
}

export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readwrite");
  await req(tx.objectStore(STORE).clear());
  await txDone(tx);
}

export async function getDataById(
  id: string,
): Promise<BackgroundRecord | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(STORE, "readonly");
  const item = await req(tx.objectStore(STORE).get(id));
  await txDone(tx);
  return item?.blob instanceof Blob ? item : undefined;
}

export function closeDatabase(): void {
  if (dbPromise) {
    void dbPromise.then((db) => db.close());
    dbPromise = null;
  }
}

export function isIndexedDBSupported(): boolean {
  return "indexedDB" in window;
}

export async function hasEnoughStorageSpace(
  requiredSpace: number,
): Promise<boolean> {
  if (!("storage" in navigator) || !navigator.storage.estimate) return true;
  const { quota, usage } = await navigator.storage.estimate();
  return quota == null || usage == null || quota - usage > requiredSpace;
}
