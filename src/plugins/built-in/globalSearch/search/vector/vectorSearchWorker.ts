import { EmbeddingIndex, getEmbedding, initializeModel } from "client-vector-search";
import type { VectorSearchResult } from "./vectorTypes";

console.log("%cVector search worker initialized", "background-color: #000; color: #fff;");

let vectorIndex: EmbeddingIndex | null = null;
let isInitialized = false;

async function initVectorSearch() {
  if (isInitialized) return;

  try {
    await initializeModel();
    vectorIndex = new EmbeddingIndex([]);
    // Load existing items from IndexedDB
    const stored = await vectorIndex.getAllObjectsFromIndexedDB();
    if (stored.length > 0) {
      stored.forEach((item) => vectorIndex!.add(item));
      console.debug("Vector index loaded from IndexedDB");
    }
    isInitialized = true;
  } catch (e) {
    console.error("Failed to initialize vector search:", e);
    throw e;
  }
}


async function searchVectors(query: string, topK: number = 10): Promise<VectorSearchResult[]> {
  if (!vectorIndex) await initVectorSearch();
  
  const queryEmbedding = await getEmbedding(query);
  const results = await vectorIndex!.search(queryEmbedding, { 
    topK,
    useStorage: 'indexedDB'
  });
  
  return results as VectorSearchResult[];
}

self.addEventListener('message', async (e) => {
  const { type, data, messageId } = e.data;

  switch (type) {
    case 'search':
      console.log("Search request received", data);
      const results = await searchVectors(data.query, data.topK);
      self.postMessage({ type: 'searchResults', data: { messageId, results } });
      break;
    default:
      console.warn(`Unknown message type: ${type}`);
  }
});

initVectorSearch();

export default function test() {
  console.log("%cTest!!!", "background-color: #000; color: #fff;");
}