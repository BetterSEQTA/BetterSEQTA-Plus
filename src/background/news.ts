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
    "https://elcapitalfinanciero.com/feed/"
  ],
  canada: [
    "https://www.cbc.ca/cmlink/rss-topstories",
    "https://calgaryherald.com/feed",
    "https://ottawacitizen.com/feed",
    "https://www.montrealgazette.com/feed"
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
    "https://news.livedoor.com/topics/rss/int.xml"
  ],
  netherlands: [
    "https://www.dutchnews.nl/feed/",
    "https://www.nrc.nl/rss/"
  ],
};

export async function fetchNews(source: string, sendResponse: any) {
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

  const parser = new Parser();
  let feeds: string[];
  console.log('fetchNews', source)

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
