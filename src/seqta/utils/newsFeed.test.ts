/**
 * @jest-environment jsdom
 */
import { describe, expect, it } from "@jest/globals";
import { parseFeed, toNewsArticles } from "./newsFeed";

const rss2 = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Example</title>
    <item>
      <title>Budget &amp; tax</title>
      <link>https://example.com/budget</link>
      <description><![CDATA[<p>The <b>budget</b> passed.</p>]]></description>
      <media:thumbnail url="https://example.com/budget.jpg" />
    </item>
    <item>
      <title>Relative</title>
      <link>/relative</link>
      <description>Plain text</description>
      <enclosure url="https://example.com/photo.png" type="image/png" length="1" />
    </item>
    <item>
      <title>Bad link</title>
      <link>javascript:alert(1)</link>
    </item>
  </channel>
</rss>`;

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title type="html">Rain &lt;em&gt;today&lt;/em&gt;</title>
    <link rel="self" href="https://example.org/self" />
    <link rel="alternate" href="https://example.org/rain" />
    <summary type="html">&lt;img src="https://example.org/rain.jpg"&gt;Heavy rain expected.</summary>
  </entry>
</feed>`;

const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">
  <item>
    <title>RDF item</title>
    <link>https://example.net/rdf</link>
    <description>From RSS 1.0</description>
  </item>
</rdf:RDF>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 items with media images and stripped HTML", () => {
    const articles = parseFeed(rss2, "https://example.com/feed.xml");
    expect(articles).toEqual([
      {
        title: "Budget & tax",
        description: "The budget passed.",
        url: "https://example.com/budget",
        imageUrl: "https://example.com/budget.jpg",
      },
      {
        title: "Relative",
        description: "Plain text",
        url: "https://example.com/relative",
        imageUrl: "https://example.com/photo.png",
      },
    ]);
  });

  it("parses Atom entries using the alternate link and inline images", () => {
    expect(parseFeed(atom)).toEqual([
      {
        title: "Rain today",
        description: "Heavy rain expected.",
        url: "https://example.org/rain",
        imageUrl: "https://example.org/rain.jpg",
      },
    ]);
  });

  it("parses RSS 1.0 (RDF) items", () => {
    expect(parseFeed(rdf)[0]).toMatchObject({ title: "RDF item", url: "https://example.net/rdf" });
  });

  it("returns nothing for invalid XML", () => {
    expect(parseFeed("<rss><channel><item>")).toEqual([]);
  });
});

describe("toNewsArticles", () => {
  it("normalises NewsAPI articles and drops unsafe links and images", () => {
    expect(
      toNewsArticles({
        articles: [
          { title: "Good", description: null, url: "https://abc.net.au/a", urlToImage: "https://abc.net.au/a.jpg" },
          { title: "Bad", url: "javascript:alert(1)" },
          { title: "No image", url: "https://abc.net.au/b", urlToImage: "data:image/png;base64,AAAA" },
        ],
      }),
    ).toEqual([
      { title: "Good", description: "", url: "https://abc.net.au/a", imageUrl: "https://abc.net.au/a.jpg" },
      { title: "No image", description: "", url: "https://abc.net.au/b", imageUrl: null },
    ]);
  });

  it("returns an empty list without a payload", () => {
    expect(toNewsArticles(undefined)).toEqual([]);
  });
});
