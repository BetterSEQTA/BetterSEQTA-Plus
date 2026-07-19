const EMBEDDIA_DB = "embeddiaDB";
const EMBEDDIA_STORE = "embeddiaObjectStore";

function openEmbeddiaDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(EMBEDDIA_DB);
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getVectorizedItemIds(): Promise<Set<string>> {
  const db = await openEmbeddiaDb();
  if (!db) return new Set();

  if (!db.objectStoreNames.contains(EMBEDDIA_STORE)) {
    db.close();
    return new Set();
  }

  try {
    const store = db
      .transaction([EMBEDDIA_STORE], "readonly")
      .objectStore(EMBEDDIA_STORE);
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const req = store.getAllKeys();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const vectorizedIds = new Set<string>();
    for (const key of keys) {
      if (typeof key === "string") vectorizedIds.add(key);
    }

    db.close();
    return vectorizedIds;
  } catch (error) {
    console.warn("Error accessing embeddia store, assuming no items are vectorized:", error);
    db.close();
    return new Set();
  }
}

export async function removeVectorEmbeddings(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const db = await openEmbeddiaDb();
  if (!db) return;

  if (!db.objectStoreNames.contains(EMBEDDIA_STORE)) {
    db.close();
    return;
  }

  try {
    const tx = db.transaction([EMBEDDIA_STORE], "readwrite");
    const store = tx.objectStore(EMBEDDIA_STORE);
    for (const id of ids) {
      store.delete(id);
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (error) {
    console.warn("[Indexer] Failed to remove vector embeddings:", error);
  } finally {
    db.close();
  }
}

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

  let text = body.textContent || body.innerText || "";

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
