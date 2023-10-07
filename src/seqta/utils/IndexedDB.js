// IndexedDB utility functions
export const openDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("MyDatabase", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target).result;
      db.createObjectStore("backgrounds", { keyPath: "id" });
    };
  });
};

export const writeData = async (type, data) => {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const tx = db.transaction("backgrounds", "readwrite");
      const store = tx.objectStore("backgrounds");
      const request = store.put({ id: "customBackground", type, data });

      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    }).catch(reject);
  });
};

export const readData = async () => {
  const db = await openDB();
  const tx = db.transaction("backgrounds", "readonly");
  const store = tx.objectStore("backgrounds");
  return store.get("customBackground");
};