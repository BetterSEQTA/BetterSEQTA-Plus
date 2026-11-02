import type { NewsFeed, NewsPayload } from "@/seqta/utils/newsFeed";

const NEWS_API_KEY = "17c0da766ba347c89d094449504e3080";
const MAX_RATE_LIMIT_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const DAY_MS = 86_400_000;

const rssFeedsByCountry: Record<string, string[]> = {
  usa: [
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://feeds.npr.org/1001/rss.xml",
  ],
  taiwan: ["https://news.ltn.com.tw/rss/all.xml", "https://www.taipeitimes.com/xml/index.rss"],
  hong_kong: [
    "https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_elocal.xml",
    "https://www.scmp.com/rss/91/feed",
  ],
  panama: [
    "https://critica.com.pa/rss.xml",
    "https://www.panamaamerica.com.pa/rss.xml",
    "https://noticiassin.com/feed/",
  ],
  canada: [
    "https://www.cbc.ca/cmlink/rss-topstories",
    "https://calgaryherald.com/feed",
    "https://ottawacitizen.com/feed",
  ],
  singapore: [
    "https://www.straitstimes.com/news/singapore/rss.xml",
    "https://www.channelnewsasia.com/rssfeeds/8395986",
  ],
  uk: ["https://feeds.bbci.co.uk/news/rss.xml", "https://www.theguardian.com/uk/rss"],
  japan: [
    "https://www3.nhk.or.jp/rss/news/cat0.xml",
    "https://news.livedoor.com/topics/rss/int.xml",
  ],
  netherlands: ["https://www.dutchnews.nl/feed/", "https://www.nrc.nl/rss/"],
};

async function fetchAustraliaNews(): Promise<NewsPayload> {
  const from = new Date(Date.now() - 5 * DAY_MS).toISOString().slice(0, 10);
  let url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=${NEWS_API_KEY}`;

  try {
    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const data = await response.json();
      if (data.code !== "rateLimited") return { articles: data.articles ?? [] };
      url += "%00";
    }
  } catch (error) {
    console.error("[BetterSEQTA+] Failed to fetch Australia news", error);
  }
  return { articles: [] };
}

async function fetchFeed(url: string): Promise<NewsFeed> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { url: response.url || url, xml: await response.text() };
}

function feedsForSource(source: string): string[] | null {
  const preset = rssFeedsByCountry[source.toLowerCase()];
  if (preset) return preset;
  return /^https?:\/\//i.test(source) ? [source] : null;
}

export async function fetchNews(source?: string): Promise<NewsPayload> {
  const normalizedSource = source?.trim() || "australia";
  if (normalizedSource === "australia") return fetchAustraliaNews();

  const feedUrls = feedsForSource(normalizedSource);
  if (!feedUrls) {
    console.warn("[BetterSEQTA+] Invalid news source, falling back to Australia", normalizedSource);
    return fetchAustraliaNews();
  }

  const results = await Promise.allSettled(feedUrls.map(fetchFeed));
  const feeds = results.flatMap((result, i) => {
    if (result.status === "fulfilled") return [result.value];
    console.error(`[BetterSEQTA+] Failed to fetch RSS feed: ${feedUrls[i]}`, result.reason);
    return [];
  });
  return { feeds };
}
