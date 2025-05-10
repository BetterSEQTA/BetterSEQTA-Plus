import { type DBSchema, type IDBPDatabase, openDB } from "idb";

// Define the schema for the background database, with a 'backgrounds' object store
interface BackgroundDB extends DBSchema {
  backgrounds: {
    key: string; // key is a string (id of the background)
    value: {
      id: string; // id of the background
      type: string; // type of the background (e.g., image type)
      blob: Blob; // blob data representing the background content
    };
  };
}

let db: IDBPDatabase<BackgroundDB> | null = null; // Variable to hold the database instance

// Function to open the IndexedDB and return the database instance
export async function openDatabase(): Promise<IDBPDatabase<BackgroundDB>> {
  if (db) return db; // If the database is already open, return it

  // Open a new database or upgrade it if necessary
  db = await openDB<BackgroundDB>("BackgroundDB", 1, {
    upgrade(db: IDBPDatabase<BackgroundDB>) {
      db.createObjectStore("backgrounds", { keyPath: "id" }); // Create object store with 'id' as the key
    },
  });

  return db;
}

// Function to read all data from the 'backgrounds' object store
export async function readAllData(): Promise<
  Array<{ id: string; type: string; blob: Blob }>
> {
  const db = await openDatabase();
  return db.getAll("backgrounds"); // Get all records from 'backgrounds' store
}

// Function to write data to the 'backgrounds' object store
export async function writeData(
  id: string,
  type: string,
  blob: Blob,
): Promise<void> {
  const db = await openDatabase();
  await db.put("backgrounds", { id, type, blob }); // Add or update the 'backgrounds' store with the given data
}

// Function to delete a background entry by its ID
export async function deleteData(id: string): Promise<void> {
  const db = await openDatabase();
  await db.delete("backgrounds", id); // Delete the entry with the specified ID
}

// Function to clear all data from the 'backgrounds' object store
export async function clearAllData(): Promise<void> {
  const db = await openDatabase();
  await db.clear("backgrounds"); // Remove all entries from the 'backgrounds' store
}

// Function to retrieve a specific background by its ID
export async function getDataById(
  id: string,
): Promise<{ id: string; type: string; blob: Blob } | undefined> {
  const db = await openDatabase();
  return db.get("backgrounds", id); // Get the background record with the given ID
}

// Function to close the database connection
export function closeDatabase(): void {
  if (db) {
    db.close(); // Close the database connection
    db = null; // Set the database instance to null
  }
}

// Helper function to check if IndexedDB is supported in the browser
export function isIndexedDBSupported(): boolean {
  return "indexedDB" in window; // Check if 'indexedDB' exists in the global window object
}

// Helper function to check if there's enough storage space available
export async function hasEnoughStorageSpace(
  requiredSpace: number,
): Promise<boolean> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    // If the storage API is available, check the estimated quota and usage
    const { quota, usage } = await navigator.storage.estimate();
    if (quota !== undefined && usage !== undefined) {
      return quota - usage > requiredSpace; // Check if the remaining space is enough for the required space
    }
  }
  // If we can't determine, assume there's enough space
  return true;
}
