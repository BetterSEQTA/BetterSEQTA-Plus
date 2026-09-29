type MessageSender = { (response?: unknown): void };

type StockPhotoResult = { title: string; thumbUrl: string; imageUrl: string };

export function handleSearchThemeStockPhotos(
  request: { query?: string; limit?: number },
  sendResponse: MessageSender,
): boolean {
  const query = request.query?.trim();
  if (!query) {
    sendResponse({ success: false, error: "Missing query" });
    return false;
  }
  const limit = Math.min(Math.max(request.limit ?? 8, 1), 12);

  void (async () => {
    try {
      const params = new URLSearchParams({
        action: "query",
        origin: "*",
        format: "json",
        generator: "search",
        gsrsearch: query,
        gsrnamespace: "6",
        gsrlimit: String(limit),
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: "1400",
      });
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
      const json = (await res.json()) as {
        query?: { pages?: Record<string, { title?: string; imageinfo?: { thumburl?: string; url?: string }[] }> };
      };
      const pages = json.query?.pages ?? {};
      const results: StockPhotoResult[] = Object.values(pages)
        .map((page) => {
          const info = page.imageinfo?.[0];
          if (!info?.url) return null;
          return {
            title: page.title?.replace(/^File:/, "") ?? "Photo",
            thumbUrl: info.thumburl ?? info.url,
            imageUrl: info.url,
          };
        })
        .filter((row): row is StockPhotoResult => row != null);

      sendResponse({ success: true, results });
    } catch (err) {
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Search failed",
      });
    }
  })();

  return true;
}
