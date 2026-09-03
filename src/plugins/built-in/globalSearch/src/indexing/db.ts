const DB_NAME = "betterseqta-index";
const META_STORE = "meta";
const VERSION_KEY = "betterseqta-index-version";

let dbPromise: Promise<IDBDatabase> | null = null;
let cachedDb: IDBDatabase | null = null;
let upgradeChain: Promise<void> = Promise.resolve();

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

function openDatabase(version?: number, extraStore?: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request =
        version != null
          ? indexedDB.open(DB_NAME, version)
          : indexedDB.open(DB_NAME);
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
    return await openDatabase(storedVersion);
  } catch (error) {
    const domError = error as DOMException | undefined;

    if (domError?.name === "VersionError") {
      console.warn(
        "[DB] localStorage version out of sync with IndexedDB; opening current version",
      );
      invalidateConnection();
      try {
        return await openDatabase();
      } catch (fallbackError) {
        console.warn("[DB] Fallback open failed, recreating database:", fallbackError);
      }
    } else {
      console.error("Error opening database:", error);
    }

    await wipeDatabase();
    return openDatabase(1);
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

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runStoreTransaction(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => void | Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const objectStoreRef = tx.objectStore(store);

    Promise.resolve(run(objectStoreRef)).catch(reject);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`IndexedDB transaction failed for ${store}`));
    tx.onabort = () => reject(tx.error ?? new Error(`IndexedDB transaction aborted for ${store}`));
  });
}

async function withUpgradeLock<T>(fn: () => Promise<T>): Promise<T> {
  const previous = upgradeChain;
  let release!: () => void;
  upgradeChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

async function openDatabaseWithStores(
  version: number,
  storesToCreate: string[],
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, version);
    } catch (error) {
      reject(error);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      for (const store of storesToCreate) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    };

    request.onsuccess = () => {
      attachConnection(request.result);
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}

async function upgradeDB(newStore: string): Promise<void> {
  await withUpgradeLock(async () => {
    invalidateConnection();

    let baseVersion = 0;

    try {
      const db = await openDatabase();
      if (db.objectStoreNames.contains(newStore)) {
        attachConnection(db);
        return;
      }
      baseVersion = db.version;
      db.close();
      cachedDb = null;
      dbPromise = null;
    } catch (error) {
      console.warn("[DB] Could not probe database version before upgrade:", error);
    }

    try {
      await openDatabaseWithStores(baseVersion + 1, [newStore]);
    } catch (error) {
      console.error("Error upgrading database:", error);
      throw error;
    }
  });
}

/**
 * Creates any missing object stores in a single version bump so later job
 * writes do not race passive observer traffic on a mid-run upgrade.
 */
export async function ensureStoresExist(stores: string[]): Promise<void> {
  const uniqueStores = [...new Set(stores.filter(Boolean))];
  if (uniqueStores.length === 0) return;

  await withUpgradeLock(async () => {
    let db: IDBDatabase;
    try {
      db = await openDB();
    } catch (error) {
      console.warn("[DB] ensureStoresExist: could not open database:", error);
      return;
    }

    const missing = uniqueStores.filter(
      (store) => !db.objectStoreNames.contains(store),
    );
    if (missing.length === 0) return;

    invalidateConnection();
    const baseVersion = db.version;
    db.close();
    cachedDb = null;
    dbPromise = null;

    try {
      await openDatabaseWithStores(baseVersion + 1, missing);
    } catch (error) {
      console.error("[DB] ensureStoresExist failed:", error);
      throw error;
    }
  });
}

async function withObjectStore<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => Promise<T>,
): Promise<T> {
  let db = await openDB();

  if (!db.objectStoreNames.contains(store)) {
    await upgradeDB(store);
    db = await openDB();
  }

  let result!: T;
  await runStoreTransaction(db, store, mode, async (objectStoreRef) => {
    result = await run(objectStoreRef);
  });
  return result;
}

export async function getAll(store: string): Promise<any[]> {
  try {
    return await withObjectStore(store, "readonly", async (s) =>
      idbRequest(s.getAll()),
    );
  } catch (error) {
    console.error(`Error in getAll for store ${store}:`, error);
    return [];
  }
}

export async function get(store: string, key: string): Promise<any> {
  try {
    return await withObjectStore(store, "readonly", async (s) =>
      idbRequest(s.get(key)),
    );
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
    await withObjectStore(store, "readwrite", async (s) => {
      await idbRequest(key ? s.put(value, key) : s.put(value));
    });
  } catch (error) {
    console.error(`Error in put for store ${store}:`, error);
    throw error;
  }
}

export async function applyStoreDiff(
  store: string,
  puts: Array<{ key: string; value: any }>,
  removeKeys: string[],
): Promise<void> {
  if (puts.length === 0 && removeKeys.length === 0) return;

  try {
    let db = await openDB();
    if (!db.objectStoreNames.contains(store)) {
      await upgradeDB(store);
      db = await openDB();
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
    const objectStoreRef = tx.objectStore(store);

    for (const key of removeKeys) {
      objectStoreRef.delete(key);
    }
    for (const { key, value } of puts) {
      objectStoreRef.put(value, key);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function remove(store: string, key: string): Promise<void> {
  try {
    await withObjectStore(store, "readwrite", async (s) => {
      await idbRequest(s.delete(key));
    });
  } catch (error) {
    console.error(`Error in remove for store ${store}, key ${key}:`, error);
    throw error;
  }
}

export async function clear(store: string): Promise<void> {
  try {
    await withObjectStore(store, "readwrite", async (s) => {
      await idbRequest(s.clear());
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
      // Database might not be open yet
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
