import Parser from "rss-parser";

// Fetches Australian news from the given URL and processes the response
const fetchAustraliaNews = async (url: string, sendResponse: any) => {
  fetch(url)
    .then((result) => result.json())
    .then((response) => {
      // Retry the request if rate-limited
      if (response.code == "rateLimited") {
        fetchAustraliaNews((url += "%00"), sendResponse);
      } else {
        sendResponse({ news: response });
      }
    });
};

// Predefined RSS feed URLs by country
const rssFeedsByCountry: Record<string, string[]> = {
  usa: [
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://www.huffpost.com/section/front-page/feed",
    "https://www.npr.org/rss/rss.php",
  ],
  taiwan: [
    "https://news.ltn.com.tw/rss/all.xml",
    "https://www.taipeitimes.com/xml/index.rss",
    "https://international.thenewslens.com/rss",
  ],
  hong_kong: [
    "https://rthk9.rthk.hk/rthk/news/rss/e_expressnews_elocal.xml",
    "https://www.scmp.com/rss/91/feed",
  ],
  panama: [
    "https://critica.com.pa/rss.xml",
    "https://www.panamaamerica.com.pa/rss.xml",
    "https://noticiassin.com/feed/",
    "https://elcapitalfinanciero.com/feed/",
  ],
  canada: [
    "https://www.cbc.ca/cmlink/rss-topstories",
    "https://calgaryherald.com/feed",
    "https://ottawacitizen.com/feed",
    "https://www.montrealgazette.com/feed",
  ],
  singapore: [
    "https://www.straitstimes.com/news/singapore/rss.xml",
    "https://www.channelnewsasia.com/rssfeeds/8395986",
  ],
  uk: [
    "http://feeds.bbci.co.uk/news/rss.xml",
    "https://www.theguardian.com/uk/rss",
  ],
  japan: [
    "https://www3.nhk.or.jp/nhkworld/en/news/feeds/",
    "https://news.livedoor.com/topics/rss/int.xml",
  ],
  netherlands: ["https://www.dutchnews.nl/feed/", "https://www.nrc.nl/rss/"],
};

// Main function to fetch news based on the source
export async function fetchNews(source: string, sendResponse: any) {
  // Handle fetching news specifically for Australia
  if (source === "australia") {
    const date = new Date();

    const from =
      date.getFullYear() +
      "-" +
      (date.getMonth() + 1) +
      "-" +
      (date.getDate() - 5);

    const url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`;
    fetchAustraliaNews(url, sendResponse); // Call the Australia-specific fetch function

    return;
  }

  const parser = new Parser();
  let feeds: string[];

  console.log("fetchNews", source);

  // Determine the appropriate RSS feed based on country or URL
  if (rssFeedsByCountry[source.toLowerCase()]) {
    // If the source is a country, fetch from predefined feeds
    feeds = rssFeedsByCountry[source.toLowerCase()];
  } else if (source.startsWith("http")) {
    // If the source is a URL, use it directly
    feeds = [source];
  } else {
    throw new Error(
      "Invalid source. Provide a country code or a valid RSS feed URL.",
    );
  }

  // Fetch articles from each RSS feed
  const articlesPromises = feeds.map(async (feedUrl) => {
    try {
      const response = await fetch(feedUrl);
      const feedString = await response.text();
      const feed = await parser.parseString(feedString);

      // Format the fetched articles
      return feed.items.map((item) => ({
        title: item.title || "",
        description: item.contentSnippet || "",
        url: item.link || "",
        urlToImage: null,
      }));
    } catch (error) {
      console.error(`Failed to fetch RSS feed: ${feedUrl}`, error);
      return [];
    }
  });

  // Wait for all articles to be fetched and combined
  const articlesArray = await Promise.all(articlesPromises);
  const articles = articlesArray.flat();

  // Send the combined news articles as the response
  sendResponse({ news: { articles } });
}
