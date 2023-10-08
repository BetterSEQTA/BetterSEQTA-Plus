export const openDB = async () => {
  const request = indexedDB.open("MyDatabase", 1);

  request.onupgradeneeded = async (event) => {
    const db = event.target.result;
    await db.createObjectStore("backgrounds", { keyPath: "id" });
  };

  return request;
};

export const writeData = async (type, data) => {
  console.log("Reading Data");
  const db = await openDB();
  console.log("Opened DB");

  const tx = db.transaction("backgrounds", "readwrite");
  const store = tx.objectStore("backgrounds");
  const request = await store.put({ id: "customBackground", type, data });

  console.log("Data written successfully");

  return request.result;
};

export const readData = async () => {
  const db = await openDB();
  const tx = db.transaction("backgrounds", "readonly");
  const store = tx.objectStore("backgrounds");
  return store.get("customBackground");
};