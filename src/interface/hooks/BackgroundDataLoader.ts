import localforage from "localforage";

type BackgroundRecord = { id: string; type: string; blob: Blob };

const store = localforage.createInstance({
  name: "BackgroundDB",
  storeName: "backgrounds",
});

export async function openDatabase(): Promise<typeof store> {
  await store.ready();
  return store;
}

export async function readAllData(): Promise<BackgroundRecord[]> {
  await store.ready();
  const items: BackgroundRecord[] = [];
  await store.iterate<BackgroundRecord, void>((value) => {
    if (value?.id && value.blob) items.push(value);
  });
  return items;
}

export async function writeData(
  id: string,
  type: string,
  blob: Blob,
): Promise<void> {
  await store.setItem(id, { id, type, blob });
}

export async function deleteData(id: string): Promise<void> {
  await store.removeItem(id);
}

export async function clearAllData(): Promise<void> {
  await store.clear();
}

export async function getDataById(
  id: string,
): Promise<BackgroundRecord | undefined> {
  const item = await store.getItem<BackgroundRecord>(id);
  return item ?? undefined;
}

export function closeDatabase(): void {}

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
