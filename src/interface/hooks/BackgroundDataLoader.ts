type BackgroundRecord = { id: string; type: string; blob: Blob };

const DB_NAME = "BackgroundDB";
const STORE_NAME = "backgrounds";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openDatabaseInternal(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
    });
  }

  return dbPromise;
}

function storeUsesInlineKeys(store: IDBObjectStore): boolean {
  return store.keyPath !== null && store.keyPath !== "";
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabaseInternal();
  const tx = db.transaction(STORE_NAME, mode);
  const result = await run(tx.objectStore(STORE_NAME));
  await waitForTransaction(tx);
  return result;
}

export async function openDatabase(): Promise<IDBDatabase> {
  return openDatabaseInternal();
}

export async function readAllData(): Promise<BackgroundRecord[]> {
  return withStore("readonly", async (store) => {
    const items: BackgroundRecord[] = [];

    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }

        const value = cursor.value as Partial<BackgroundRecord> | undefined;
        const id =
          typeof value?.id === "string"
            ? value.id
            : cursor.key == null
              ? ""
              : String(cursor.key);

        if (id && value?.blob instanceof Blob) {
          items.push({
            id,
            type: typeof value.type === "string" ? value.type : "image",
            blob: value.blob,
          });
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });

    return items;
  });
}

export async function writeData(
  id: string,
  type: string,
  blob: Blob,
): Promise<void> {
  const record: BackgroundRecord = { id, type, blob };

  try {
    await withStore("readwrite", async (store) => {
      const request = storeUsesInlineKeys(store)
        ? store.put(record)
        : store.put(record, id);
      await promisifyRequest(request);
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to save background: ${detail}`);
  }
}

export async function deleteData(id: string): Promise<void> {
  try {
    await withStore("readwrite", async (store) => {
      await promisifyRequest(store.delete(id));
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to delete background: ${detail}`);
  }
}

export async function clearAllData(): Promise<void> {
  await withStore("readwrite", async (store) => {
    await promisifyRequest(store.clear());
  });
}

export async function getDataById(
  id: string,
): Promise<BackgroundRecord | undefined> {
  const item = await withStore("readonly", async (store) =>
    promisifyRequest(store.get(id)),
  );
  if (!item?.id || !(item.blob instanceof Blob)) return undefined;
  return item as BackgroundRecord;
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
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined && usage !== undefined) {
      return quota - usage > requiredSpace;
    }
  }
  return true;
}
