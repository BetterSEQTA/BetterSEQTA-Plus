import { AppendLoadingSymbol } from "@/seqta/ui/Loading";
import stringToHTML from "./stringToHTML";
import { delay } from "./delay";
import { settingsState } from "./listeners/SettingsState";
import browser from "webextension-polyfill";
import LogoLightOutline from "@/resources/icons/betterseqta-light-outline.png";
import { animate, stagger } from "motion";

export async function SendNewsPage() {
  console.info("[BetterSEQTA+] Started Loading News Page");
  document.title = "News ― SEQTA Learn";
  await delay(10);

  const element = document.querySelector("[data-key=news]");
  element!.classList.add("active");

  // Remove all current elements in the main div to add new elements
  const main = document.getElementById("main");
  main!.innerHTML = "";

  const html = stringToHTML(/* html */ `
    <div class="home-root">
      <div class="home-container" id="news-container">
      <h1 class="border">Latest Headlines in ${settingsState.newsSource ? settingsState.newsSource.charAt(0).toUpperCase() + settingsState.newsSource.slice(1) : "Australia"}</h1>
      </div>
    </div>`);

  main!.append(html.firstChild!);

  const titlediv = document.getElementById("title")!.firstChild;
  (titlediv! as HTMLElement).innerText = "News";
  AppendLoadingSymbol("newsloading", "#news-container");

  const response = (await browser.runtime.sendMessage({
    type: "sendNews",
    source: settingsState.newsSource,
  })) as any;
  const newscontainer = document.querySelector("#news-container");
  document.getElementById("newsloading")?.remove();

  // Create a document fragment to batch DOM operations
  const fragment = document.createDocumentFragment();

  // Map over articles to create elements
  response.news.articles.forEach((article: any) => {
    const newsarticle = document.createElement("a");
    newsarticle.classList.add("NewsArticle");
    newsarticle.href = article.url;
    newsarticle.target = "_blank";

    const articleimage = document.createElement("div");
    articleimage.classList.add("articleimage");

    if (article.urlToImage == "null" || article.urlToImage == null) {
      articleimage.style.cssText = `
        background-image: url(${browser.runtime.getURL(LogoLightOutline)});
        width: 20%;
        margin: 0 7.5%;
      `;
    } else {
      articleimage.style.backgroundImage = `url(${article.urlToImage})`;
    }

    const articletext = document.createElement("div");
    articletext.classList.add("ArticleText");

    const title = document.createElement("a");
    title.innerText = article.title;
    title.href = article.url;
    title.target = "_blank";

    const description = document.createElement("p");

    article.description =
      article.description.length > 400
        ? article.description.substring(0, 400) + "..."
        : article.description;
    description.innerHTML = article.description;

    articletext.append(title, description);
    newsarticle.append(articleimage, articletext);
    fragment.append(newsarticle);
  });

  // Single DOM update to append all articles
  newscontainer?.append(fragment);

  if (!settingsState.animations) return;

  const articles = Array.from(document.querySelectorAll(".NewsArticle"));

  animate(
    articles.slice(0, 20),
    { opacity: [0, 1], y: [10, 0], scale: [0.99, 1] },
    {
      delay: stagger(0.1),
      type: "spring",
      stiffness: 341,
      damping: 20,
      mass: 1,
    },
  );
}
