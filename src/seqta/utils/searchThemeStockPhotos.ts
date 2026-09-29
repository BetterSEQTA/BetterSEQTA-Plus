import browser from "webextension-polyfill";

export type StockPhotoResult = { title: string; thumbUrl: string; imageUrl: string };

export async function searchThemeStockPhotos(
  query: string,
  limit = 8,
): Promise<StockPhotoResult[]> {
  const res = (await browser.runtime.sendMessage({
    type: "searchThemeStockPhotos",
    query,
    limit,
  })) as { success?: boolean; results?: StockPhotoResult[]; error?: string };

  if (!res?.success || !res.results) {
    throw new Error(res?.error ?? "Could not search photos");
  }
  return res.results;
}

export async function fetchStockPhotoBlob(imageUrl: string): Promise<Blob> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Could not download photo");
  return await res.blob();
}
