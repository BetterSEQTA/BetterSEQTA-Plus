import { AppendLoadingSymbol } from "@/seqta/ui/loading";
import stringToHTML from "./stringToHTML";
import { delay } from "./delay";
import { settingsState } from "./listeners/settingsState";
import browser from "@/lib/browser";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import LogoLightOutline from "@/resources/icons/betterseqta-light-outline.png";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { animate, stagger } from "motion";
import { verboseInfo } from "@/utils/verboseLog";
import { toNewsArticles, type NewsPayload } from "@/seqta/utils/newsFeed";
import { isFeatureDisabled } from "@/seqta/utils/remoteStatus";

export async function SendNewsPage() {
  if (isFeatureDisabled("page.news")) return;

  verboseInfo("[BetterSEQTA+] Started Loading News Page");
  document.title = "News ― SEQTA Learn";
  await delay(10);

  const element = document.querySelector("[data-key=news]");
  element?.classList.add("active");

  const main = document.getElementById("main");
  if (!main) {
    console.warn("[BetterSEQTA+] News page: #main not found");
    return;
  }

  main.innerHTML = "";

  const displayCountry = (() => {
    switch (settingsState.newsSource?.toLowerCase()) {
      case "usa":
        return "the USA";
      case "uk":
        return "the UK";
      case "netherlands":
        return "the Netherlands";
      default:
        return settingsState.newsSource
          ? settingsState.newsSource
              .split("_")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")
          : "Australia";
    }
  })();

  const html = stringToHTML(/* html */ `
  <div class="home-root">
    <div class="home-container" id="news-container">
      <h1 class="bsplus-rounded">Latest Headlines in ${displayCountry}</h1>
    </div>
  </div>`);

  main.append(html.firstChild!);

  void import("@/seqta/ui/titlebar/mountCustomTitleBar").then((mod) => {
    mod.setCustomTitleBarText("News");
  });
  if (!document.getElementById("bsplus-title-root")) {
    const titleBar = document.getElementById("title")?.firstChild;
    if (titleBar instanceof HTMLElement) titleBar.innerText = "News";
  }
  AppendLoadingSymbol("newsloading", "#news-container");

  const response = (await browser.runtime.sendMessage({
    type: "sendNews",
    source: settingsState.newsSource,
  })) as { news?: NewsPayload } | undefined;
  const newscontainer = document.querySelector("#news-container");
  document.getElementById("newsloading")?.remove();

  const articles = toNewsArticles(response?.news);
  if (articles.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.classList.add("day-empty");
    const img = document.createElement("img");
    img.src = resolveExtensionAssetUrl(LogoLight);
    const text = document.createElement("p");
    text.innerText = "No news articles available right now.";
    emptyState.append(img, text);
    newscontainer?.append(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const article of articles) {
    const newsarticle = document.createElement("a");
    newsarticle.classList.add("NewsArticle");
    newsarticle.href = article.url;
    newsarticle.target = "_blank";

    const articleimage = document.createElement("div");
    articleimage.classList.add("articleimage");

    if (article.imageUrl) {
      articleimage.style.backgroundImage = `url(${JSON.stringify(article.imageUrl)})`;
    } else {
      articleimage.style.cssText = `
        background-image: url(${resolveExtensionAssetUrl(LogoLightOutline)});
        width: 20%;
        margin: 0 7.5%;
      `;
    }

    const articletext = document.createElement("div");
    articletext.classList.add("ArticleText");

    const title = document.createElement("a");
    title.innerText = article.title;
    title.href = article.url;
    title.target = "_blank";

    const description = document.createElement("p");
    const articleDescription = article.description || "No description available.";
    description.textContent =
      articleDescription.length > 400 ? `${articleDescription.slice(0, 400)}…` : articleDescription;

    articletext.append(title, description);
    newsarticle.append(articleimage, articletext);
    fragment.append(newsarticle);
  }

  newscontainer?.append(fragment);

  if (!settingsState.animations) return;

  const animatedArticles = Array.from(document.querySelectorAll(".NewsArticle"));

  animate(
    animatedArticles.slice(0, 20),
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
