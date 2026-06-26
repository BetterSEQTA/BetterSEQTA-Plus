const DB_NAME = "betterseqta-index";
const META_STORE = "meta";
const VERSION_KEY = "betterseqta-index-version";

let dbPromise: Promise<IDBDatabase> | null = null;
let cachedDb: IDBDatabase | null = null;

function getCurrentVersion(): number {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  return storedVersion ? parseInt(storedVersion, 10) : 1;
}

function updateVersion(version: number) {
  localStorage.setItem(VERSION_KEY, version.toString());
}

function invalidateConnection(): void {
  if (cachedDb) {
    cachedDb.close();
    cachedDb = null;
  }
  dbPromise = null;
}

function attachConnection(db: IDBDatabase): void {
  if (cachedDb && cachedDb !== db) {
    cachedDb.close();
  }
  cachedDb = db;
  cachedDb.onclose = () => {
    cachedDb = null;
    dbPromise = null;
  };
  updateVersion(db.version);
}

function setupUpgradeHandler(
  request: IDBOpenDBRequest,
  extraStore?: string,
): void {
  request.onupgradeneeded = (event) => {
    const db = request.result;

    if (!Array.from(db.objectStoreNames).includes(META_STORE)) {
      db.createObjectStore(META_STORE);
    }

    if (extraStore && !db.objectStoreNames.contains(extraStore)) {
      db.createObjectStore(extraStore);
    }

    if (event.newVersion != null) {
      updateVersion(event.newVersion);
    }
  };
}

function openAtVersion(version: number, extraStore?: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DB_NAME, version);
    } catch (error) {
      reject(error);
      return;
    }

    setupUpgradeHandler(request, extraStore);

    request.onsuccess = () => {
      attachConnection(request.result);
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
  });
}

function openAtCurrentVersion(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);

    setupUpgradeHandler(request);

    request.onsuccess = () => {
      attachConnection(request.result);
      resolve(request.result);
    };

    request.onerror = () => reject(request.error);
  });
}

function wipeDatabase(): Promise<void> {
  invalidateConnection();
  localStorage.removeItem(VERSION_KEY);
  return deleteDatabaseWithRetries(DB_NAME);
}

function deleteDatabaseWithRetries(
  name: string,
  maxAttempts = 6,
): Promise<void> {
  return new Promise((resolve) => {
    const attemptDelete = (attempt: number) => {
      let req: IDBOpenDBRequest;
      try {
        req = indexedDB.deleteDatabase(name);
      } catch (error) {
        console.warn(`[DB] Could not start delete of ${name}:`, error);
        resolve();
        return;
      }

      req.onsuccess = () => resolve();

      req.onerror = () => {
        console.warn(`[DB] Error deleting ${name}:`, req.error);
        if (attempt + 1 < maxAttempts) {
          setTimeout(() => attemptDelete(attempt + 1), 150 * (attempt + 1));
          return;
        }
        resolve();
      };

      req.onblocked = () => {
        console.warn(
          `[DB] Delete of ${name} blocked (attempt ${attempt + 1}/${maxAttempts}); waiting for connections to close`,
        );
        if (attempt + 1 < maxAttempts) {
          setTimeout(() => attemptDelete(attempt + 1), 200 * (attempt + 1));
          return;
        }
        resolve();
      };
    };

    attemptDelete(0);
  });
}

export function closeSearchDatabase(): void {
  invalidateConnection();
}

if (typeof window !== "undefined") {
  window.addEventListener("betterseqta-reset-search-index", () => {
    closeSearchDatabase();
  });
}

async function openDBInternal(): Promise<IDBDatabase> {
  const storedVersion = getCurrentVersion();

  try {
    return await openAtVersion(storedVersion);
  } catch (error) {
    const domError = error as DOMException | undefined;

    if (domError?.name === "VersionError") {
      console.warn(
        "[DB] localStorage version out of sync with IndexedDB; opening current version",
      );
      invalidateConnection();
      try {
        return await openAtCurrentVersion();
      } catch (fallbackError) {
        console.warn("[DB] Fallback open failed, recreating database:", fallbackError);
      }
    } else {
      console.error("Error opening database:", error);
    }

    await wipeDatabase();
    return openAtVersion(1);
  }
}

function openDB(): Promise<IDBDatabase> {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }

  if (dbPromise) return dbPromise;

  dbPromise = openDBInternal();
  return dbPromise;
}

async function getStore(store: string, mode: IDBTransactionMode = "readonly") {
  const db = await openDB();

  if (!db.objectStoreNames.contains(store)) {
    await upgradeDB(store);

    const upgradedDb = await openDB();
    const tx = upgradedDb.transaction(store, mode);
    return tx.objectStore(store);
  }

  const tx = db.transaction(store, mode);
  return tx.objectStore(store);
}

async function upgradeDB(newStore: string): Promise<void> {
  invalidateConnection();

  let baseVersion = 0;

  try {
    const db = await openAtCurrentVersion();
    baseVersion = db.version;
    db.close();
    cachedDb = null;
    dbPromise = null;
  } catch (error) {
    console.warn("[DB] Could not probe database version before upgrade:", error);
  }

  const newVersion = baseVersion + 1;

  try {
    await openAtVersion(newVersion, newStore);
  } catch (error) {
    console.error("Error upgrading database:", error);
    throw error;
  }
}

export async function getAll(store: string): Promise<any[]> {
  try {
    const s = await getStore(store);
    return new Promise((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in getAll for store ${store}:`, error);
    return [];
  }
}

export async function get(store: string, key: string): Promise<any> {
  try {
    const s = await getStore(store);
    return new Promise((resolve, reject) => {
      const req = s.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in get for store ${store}, key ${key}:`, error);
    return null;
  }
}

export async function put(
  store: string,
  value: any,
  key?: string,
): Promise<void> {
  try {
    const s = await getStore(store, "readwrite");
    return new Promise((resolve, reject) => {
      const req = key ? s.put(value, key) : s.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in put for store ${store}:`, error);
    throw error;
  }
}

/**
 * Apply puts and deletes in a single readwrite transaction.
 */
export async function applyStoreDiff(
  store: string,
  puts: Array<{ key: string; value: any }>,
  removeKeys: string[],
): Promise<void> {
  if (puts.length === 0 && removeKeys.length === 0) return;

  try {
    const db = await openDB();

    if (!db.objectStoreNames.contains(store)) {
      await upgradeDB(store);
      const upgradedDb = await openDB();
      await runStoreDiffTransaction(upgradedDb, store, puts, removeKeys);
      return;
    }

    await runStoreDiffTransaction(db, store, puts, removeKeys);
  } catch (error) {
    console.error(`Error in applyStoreDiff for store ${store}:`, error);
    throw error;
  }
}

function runStoreDiffTransaction(
  db: IDBDatabase,
  store: string,
  puts: Array<{ key: string; value: any }>,
  removeKeys: string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const objectStore = tx.objectStore(store);

    for (const key of removeKeys) {
      objectStore.delete(key);
    }
    for (const { key, value } of puts) {
      objectStore.put(value, key);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function remove(store: string, key: string): Promise<void> {
  try {
    const s = await getStore(store, "readwrite");
    return new Promise((resolve, reject) => {
      const req = s.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in remove for store ${store}, key ${key}:`, error);
    throw error;
  }
}

export async function clear(store: string): Promise<void> {
  try {
    const s = await getStore(store, "readwrite");
    return new Promise((resolve, reject) => {
      const req = s.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`Error in clear for store ${store}:`, error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // Database might not be open yet, that's okay
    }
  }

  invalidateConnection();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("betterseqta-reset-search-index"));
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  localStorage.removeItem(VERSION_KEY);
  await deleteDatabaseWithRetries(DB_NAME);
}
