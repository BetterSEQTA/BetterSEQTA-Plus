export type NewsApiArticle = {
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
};

export type NewsFeed = { url: string; xml: string };

export type NewsPayload = { articles: NewsApiArticle[] } | { feeds: NewsFeed[] };

export type NewsArticle = {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
};

function safeHttpUrl(value: string | null | undefined, base?: string): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

function firstImageInHtml(html: string): string | null {
  return new DOMParser().parseFromString(html, "text/html").querySelector("img")?.getAttribute("src") ?? null;
}

function children(el: Element, name: string): Element[] {
  return [...el.children].filter((child) => child.localName === name);
}

function childText(el: Element, ...names: string[]): string {
  for (const name of names) {
    const text = children(el, name)[0]?.textContent?.trim();
    if (text) return text;
  }
  return "";
}

function itemLink(item: Element): string {
  const links = children(item, "link");
  const alternate = links.find((link) => (link.getAttribute("rel") ?? "alternate") === "alternate");
  return alternate?.getAttribute("href") || alternate?.textContent?.trim() || childText(item, "guid", "id");
}

function itemImage(item: Element, descriptionHtml: string): string | null {
  const media = [...item.getElementsByTagNameNS("*", "thumbnail"), ...item.getElementsByTagNameNS("*", "content")]
    .filter((el) => el.namespaceURI?.includes("mrss"))
    .find((el) => el.getAttribute("url") && (!el.getAttribute("medium") || el.getAttribute("medium") === "image"));
  if (media) return media.getAttribute("url");

  const enclosure = children(item, "enclosure").find((el) => el.getAttribute("type")?.startsWith("image/"));
  if (enclosure) return enclosure.getAttribute("url");

  return descriptionHtml ? firstImageInHtml(descriptionHtml) : null;
}

export function parseFeed(xml: string, feedUrl?: string): NewsArticle[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) return [];

  return [...doc.querySelectorAll("item, entry")].flatMap((item) => {
    const url = safeHttpUrl(itemLink(item), feedUrl);
    if (!url) return [];
    const descriptionHtml = childText(item, "description", "summary", "encoded", "content");
    return [
      {
        title: htmlToText(childText(item, "title")),
        description: htmlToText(descriptionHtml),
        url,
        imageUrl: safeHttpUrl(itemImage(item, descriptionHtml), url),
      },
    ];
  });
}

export function toNewsArticles(payload: NewsPayload | undefined): NewsArticle[] {
  if (!payload) return [];
  if ("feeds" in payload) return payload.feeds.flatMap((feed) => parseFeed(feed.xml, feed.url));

  return payload.articles.flatMap((article) => {
    const url = safeHttpUrl(article.url);
    if (!url) return [];
    return [
      {
        title: article.title ?? "",
        description: article.description ?? "",
        url,
        imageUrl: safeHttpUrl(article.urlToImage),
      },
    ];
  });
}
