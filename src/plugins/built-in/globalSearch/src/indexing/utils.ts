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

const EMBEDDIA_DB = "embeddiaDB";
const EMBEDDIA_STORE = "embeddiaObjectStore";

/**
 * Remove vector embeddings for the given item ids from embeddiaDB.
 */
export async function removeVectorEmbeddings(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  return new Promise((resolve) => {
    const request = indexedDB.open(EMBEDDIA_DB);

    request.onerror = () => resolve();

    request.onsuccess = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(EMBEDDIA_STORE)) {
        db.close();
        resolve();
        return;
      }

      try {
        const transaction = db.transaction([EMBEDDIA_STORE], "readwrite");
        const store = transaction.objectStore(EMBEDDIA_STORE);

        for (const id of ids) {
          store.delete(id);
        }

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };

        transaction.onerror = () => {
          db.close();
          resolve();
        };
      } catch (error) {
        console.warn("[Indexer] Failed to remove vector embeddings:", error);
        db.close();
        resolve();
      }
    };
  });
}

/**
 * Delete vector embeddings that no longer exist in the structured index.
 * Returns the number of orphaned embeddings removed.
 */
export async function pruneOrphanVectorEmbeddings(
  liveItemIds: Set<string>,
): Promise<number> {
  const vectorizedIds = await getVectorizedItemIds();
  const orphanIds = [...vectorizedIds].filter((id) => !liveItemIds.has(id));

  if (orphanIds.length > 0) {
    console.debug(
      `[Indexer] Pruning ${orphanIds.length} orphaned vector embedding(s)`,
    );
    await removeVectorEmbeddings(orphanIds);
  }

  return orphanIds.length;
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
