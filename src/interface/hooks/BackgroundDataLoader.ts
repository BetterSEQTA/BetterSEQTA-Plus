import { type DBSchema, type IDBPDatabase, openDB } from "idb";

/**
 * Defines the schema for the IndexedDB database used for storing background image data.
 *
 * @interface BackgroundDB
 * @extends {DBSchema}
 * @property {object} backgrounds - The object store for background images.
 * @property {string} backgrounds.key - The type of the key for the object store (in this case, it's `id` as defined in `keyPath`).
 * @property {object} backgrounds.value - The structure of the objects stored.
 * @property {string} backgrounds.value.id - The unique identifier for the background image record.
 * @property {string} backgrounds.value.type - The MIME type of the image (e.g., "image/png", "image/jpeg").
 * @property {Blob} backgrounds.value.blob - The binary large object (Blob) containing the image data.
 */
interface BackgroundDB extends DBSchema {
  backgrounds: {
    key: string; // Corresponds to the 'id' property due to keyPath: "id"
    value: {
      id: string;
      type: string;
      blob: Blob;
    };
  };
}

let db: IDBPDatabase<BackgroundDB> | null = null;

/**
 * Initializes and opens an IndexedDB connection or returns an existing one.
 * If the database doesn't exist or needs an upgrade, the `upgrade` callback
 * creates the 'backgrounds' object store with 'id' as the keyPath.
 *
 * @async
 * @returns {Promise<IDBPDatabase<BackgroundDB>>} A promise that resolves with the database instance.
 */
export async function openDatabase(): Promise<IDBPDatabase<BackgroundDB>> {
  if (db) return db;

  db = await openDB<BackgroundDB>("BackgroundDB", 1, {
    upgrade(db: IDBPDatabase<BackgroundDB>) {
      db.createObjectStore("backgrounds", { keyPath: "id" });
    },
  });

  return db;
}

/**
 * Retrieves all background image records from the 'backgrounds' object store in IndexedDB.
 *
 * @async
 * @returns {Promise<Array<{id: string, type: string, blob: Blob}>>} A promise that resolves with an array of all background image records.
 */
export async function readAllData(): Promise<
  Array<{ id: string; type: string; blob: Blob }>
> {
  const db = await openDatabase();
  return db.getAll("backgrounds");
}

/**
 * Writes or updates a background image record in the 'backgrounds' object store.
 * If a record with the given `id` already exists, it will be updated. Otherwise, a new record is created.
 *
 * @async
 * @param {string} id - The unique identifier for the background image record.
 * @param {string} type - The MIME type of the image (e.g., "image/png").
 * @param {Blob} blob - The Blob object containing the image data.
 * @returns {Promise<void>} A promise that resolves when the data has been successfully written.
 */
export async function writeData(
  id: string,
  type: string,
  blob: Blob,
): Promise<void> {
  const db = await openDatabase();
  await db.put("backgrounds", { id, type, blob });
}

/**
 * Deletes a background image record from the 'backgrounds' object store by its ID.
 *
 * @async
 * @param {string} id - The unique identifier of the background image record to delete.
 * @returns {Promise<void>} A promise that resolves when the data has been successfully deleted.
 */
export async function deleteData(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete("backgrounds", id);
}

/**
 * Clears all records from the 'backgrounds' object store in IndexedDB.
 *
 * @async
 * @returns {Promise<void>} A promise that resolves when all data has been successfully cleared.
 */
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  await db.clear("backgrounds");
}

/**
 * Retrieves a single background image record from the 'backgrounds' object store by its ID.
 *
 * @async
 * @param {string} id - The unique identifier of the background image record to retrieve.
 * @returns {Promise<{id: string, type: string, blob: Blob} | undefined>} A promise that resolves with the
 *                                                                        background image record if found, or undefined otherwise.
 */
export async function getDataById(
  id: string,
): Promise<{ id: string; type: string; blob: Blob } | undefined> {
  const db = await openDatabase();
  return db.get("backgrounds", id);
}

/**
 * Closes the active IndexedDB connection and nullifies the global `db` variable.
 * This is important to release resources and allow for proper database management.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Checks if IndexedDB is supported by the current browser environment.
 *
 * @returns {boolean} True if IndexedDB is supported, false otherwise.
 */
export function isIndexedDBSupported(): boolean {
  return "indexedDB" in window;
}

/**
 * Estimates available storage space and checks if it's sufficient for the specified `requiredSpace`.
 * Uses the `navigator.storage.estimate()` API if available.
 * If the API is not available or cannot determine space, it defaults to assuming enough space is available.
 *
 * @async
 * @param {number} requiredSpace - The amount of storage space required, in bytes.
 * @returns {Promise<boolean>} A promise that resolves with true if enough space is estimated to be available, false otherwise.
 */
export async function hasEnoughStorageSpace(
  requiredSpace: number,
): Promise<boolean> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined && usage !== undefined) {
      return quota - usage > requiredSpace;
    }
  }
  // If we can't determine, assume there's enough space
  return true;
}
