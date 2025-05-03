const DB_NAME = "betterseqta-index";
const META_STORE = "meta";
const VERSION_KEY = "betterseqta-index-version";

let dbPromise: Promise<IDBDatabase> | null = null;

// Get the current version from localStorage or start at 1
function getCurrentVersion(): number {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  return storedVersion ? parseInt(storedVersion, 10) : 1;
}

// Update the version in localStorage
function updateVersion(version: number) {
  localStorage.setItem(VERSION_KEY, version.toString());
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const currentVersion = getCurrentVersion();

  dbPromise = new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DB_NAME, currentVersion);
    } catch (e) {
      // If there's a version error, try to delete the database and start fresh
      console.warn("Database version conflict, recreating database...");
      indexedDB.deleteDatabase(DB_NAME);
      localStorage.removeItem(VERSION_KEY);
      request = indexedDB.open(DB_NAME, 1);
      updateVersion(1);
    }

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const existingStores = Array.from(db.objectStoreNames);

      // Always ensure META_STORE exists
      if (!existingStores.includes(META_STORE)) {
        db.createObjectStore(META_STORE);
      }

      // Update version in localStorage to match the database
      updateVersion(event.newVersion || 1);
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => {
      console.error("Error opening database:", request.error);
      // If there's an error, try to recover by deleting and recreating
      indexedDB.deleteDatabase(DB_NAME);
      localStorage.removeItem(VERSION_KEY);
      reject(request.error);
    };
  });

  return dbPromise;
}

async function getStore(store: string, mode: IDBTransactionMode = "readonly") {
  const db = await openDB();

  // Create store dynamically if needed
  if (!db.objectStoreNames.contains(store)) {
    db.close();
    await upgradeDB(store);
    return getStore(store, mode);
  }

  const tx = db.transaction(store, mode);
  return tx.objectStore(store);
}

function upgradeDB(newStore: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const currentVersion = getCurrentVersion();
    const newVersion = currentVersion + 1;

    // Close any existing connections
    if (dbPromise) {
      dbPromise.then((db) => db.close());
      dbPromise = null;
    }

    const request = indexedDB.open(DB_NAME, newVersion);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(newStore)) {
        db.createObjectStore(newStore);
      }
      // Update version in localStorage
      updateVersion(event.newVersion || newVersion);
    };

    request.onsuccess = () => {
      dbPromise = Promise.resolve(request.result);
      resolve();
    };

    request.onerror = () => {
      console.error("Error upgrading database:", request.error);
      reject(request.error);
    };
  });
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

// Helper function to reset the database if needed
export async function resetDatabase(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => {
      localStorage.removeItem(VERSION_KEY);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
