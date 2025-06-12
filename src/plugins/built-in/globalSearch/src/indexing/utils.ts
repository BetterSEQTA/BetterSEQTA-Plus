/**
 * Check which items are already vectorized in embeddia's IndexedDB
 * Returns a Set of item IDs that are already indexed
 */
export async function getVectorizedItemIds(): Promise<Set<string>> {
  return new Promise((resolve) => {
    const request = indexedDB.open("embeddiaDB");
    
    request.onerror = () => {
      console.debug("Could not open embeddiaDB, assuming no items are vectorized");
      resolve(new Set());
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains("embeddiaObjectStore")) {
        console.debug("embeddiaObjectStore not found, assuming no items are vectorized");
        db.close();
        resolve(new Set());
        return;
      }
      
      try {
        const transaction = db.transaction(["embeddiaObjectStore"], "readonly");
        const store = transaction.objectStore("embeddiaObjectStore");
        const getAllRequest = store.getAllKeys();
        
        getAllRequest.onsuccess = () => {
          const vectorizedIds = new Set<string>();
          getAllRequest.result.forEach(key => {
            if (typeof key === 'string') {
              vectorizedIds.add(key);
            }
          });
          
          console.debug(`Found ${vectorizedIds.size} already vectorized items in embeddia DB`);
          db.close();
          resolve(vectorizedIds);
        };
        
        getAllRequest.onerror = () => {
          console.warn("Error reading vectorized item keys, assuming no items are vectorized");
          db.close();
          resolve(new Set());
        };
      } catch (error) {
        console.warn("Error accessing embeddia store, assuming no items are vectorized:", error);
        db.close();
        resolve(new Set());
      }
    };
  });
}

export function htmlToPlainText(rawHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");
  const { body } = doc;

  body
    .querySelectorAll("script,style,template,noscript,meta,link")
    .forEach((el) => el.remove());

  body.querySelectorAll(".forward").forEach((el) => {
    let n: ChildNode | null = el;
    while (n) {
      const next = n.nextSibling as ChildNode | null;
      n.remove();
      n = next;
    }
  });

  let text = body.innerText || "";

  text = text
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^[.\w#][^{]{0,100}\{[^}]*\}$/gm, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0 || line === "")
    .join("\n")
    .trim();

  return text;
}
