import Parser from 'rss-parser';

const fetchAustraliaNews = async (url: string, sendResponse: any) => {
  fetch(url)
    .then((result) => result.json())
    .then((response) => {
      if (response.code == 'rateLimited') {
        fetchAustraliaNews(url += '%00', sendResponse);
      } else {
        sendResponse({ news: response });
      }
    });
};

const rssFeedsByCountry: Record<string, string[]> = {
  usa: [
    "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
    "https://www.huffpost.com/section/front-page/feed",
    "https://www.npr.org/rss/rss.php",
  ],
  taiwan: [
    "https://focustaiwan.tw/rss",
    "https://www.taipeitimes.com/rss/all.xml",
    "https://international.thenewslens.com/rss",
  ],
  hong_kong: [
    "https://news.rthk.hk/rthk/en/rss.htm",
    "https://www.scmp.com/rss/91/feed",
  ],
  panama: [
    "http://www.panama-guide.com/backend.php",
  ],
  canada: [
    "https://www.cbc.ca/cmlink/rss-topstories",
    "https://www.theglobeandmail.com/?service=rss",
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
    "https://www.japantimes.co.jp/feed/topstories.xml",
    "https://www3.nhk.or.jp/nhkworld/en/news/feeds/",
  ],
  netherlands: [
    "https://www.dutchnews.nl/feed/",
    "http://feeds.nos.nl/nosnieuwsalgemeen",
  ],
};

export async function fetchNews(source: string, sendResponse: any) {
  const parser = new Parser();
  let feeds: string[];

  if (source === "australia") {
    const date = new Date();

    const from =
      date.getFullYear() +
      '-' +
      (date.getMonth() + 1) +
      '-' +
      (date.getDate() - 5);
  
    const url = `https://newsapi.org/v2/everything?domains=abc.net.au&from=${from}&apiKey=17c0da766ba347c89d094449504e3080`;
    fetchAustraliaNews(url, sendResponse);

    return;
  }

  if (rssFeedsByCountry[source.toLowerCase()]) {
    // If the source is a country, fetch from predefined feeds
    feeds = rssFeedsByCountry[source.toLowerCase()];
  } else if (source.startsWith("http")) {
    // If the source is a URL, use it directly
    feeds = [source];
  } else {
    throw new Error("Invalid source. Provide a country code or a valid RSS feed URL.");
  }

  const articlesPromises = feeds.map(async (feedUrl) => {
    try {
      const response = await fetch(feedUrl);
      const feedString = await response.text();
      const feed = await parser.parseString(feedString);

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

  const articlesArray = await Promise.all(articlesPromises);
  const articles = articlesArray.flat();

  sendResponse({ news: { articles } });
}
