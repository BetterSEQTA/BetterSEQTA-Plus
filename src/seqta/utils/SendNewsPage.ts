import { AppendLoadingSymbol } from "@/seqta/ui/Loading"; // Import function to append loading symbol
import stringToHTML from "./stringToHTML"; // Import function to convert string to HTML
import { delay } from "./delay"; // Import delay function
import { settingsState } from "./listeners/SettingsState"; // Import settings state
import browser from "webextension-polyfill"; // Import webextension API polyfill
import LogoLightOutline from "@/resources/icons/betterseqta-light-outline.png"; // Import logo image
import { animate, stagger } from "motion"; // Import animation utilities

// Async function to load and display the news page
export async function SendNewsPage() {
  console.info("[BetterSEQTA+] Started Loading News Page"); // Log page load initiation
  document.title = "News ― SEQTA Learn"; // Set the page title
  await delay(100); // Wait for 100ms

  const element = document.querySelector("[data-key=news]"); // Select news element
  element!.classList.add("active"); // Add "active" class to the news element

  // Remove all current elements in the main div to add new elements
  const main = document.getElementById("main");
  main!.innerHTML = ""; // Clear the main div

  // Create HTML structure for news page using stringToHTML function
  const html = stringToHTML(/* html */ `
    <div class="home-root">
      <div class="home-container" id="news-container">
      <h1 class="border">Latest Headlines in ${settingsState.newsSource ? settingsState.newsSource.charAt(0).toUpperCase() + settingsState.newsSource.slice(1) : "Australia"}</h1>
      </div>
    </div>`);

  main!.append(html.firstChild!); // Append the generated HTML to the main div

  const titlediv = document.getElementById("title")!.firstChild; // Get the title div
  (titlediv! as HTMLElement).innerText = "News"; // Set the title text to "News"
  AppendLoadingSymbol("newsloading", "#news-container"); // Append loading symbol

  // Fetch news articles from the background script
  const response = (await browser.runtime.sendMessage({
    type: "sendNews", // Send message to fetch news
    source: settingsState.newsSource, // Use the selected news source
  })) as any;
  const newscontainer = document.querySelector("#news-container");
  document.getElementById("newsloading")?.remove(); // Remove loading symbol after response

  // Create a document fragment to batch DOM operations for performance
  const fragment = document.createDocumentFragment();

  // Iterate through the news articles to create DOM elements for each
  response.news.articles.forEach((article: any) => {
    const newsarticle = document.createElement("a"); // Create anchor for the article
    newsarticle.classList.add("NewsArticle"); // Add "NewsArticle" class
    newsarticle.href = article.url; // Set article URL
    newsarticle.target = "_blank"; // Open article in a new tab

    const articleimage = document.createElement("div"); // Create div for article image
    articleimage.classList.add("articleimage"); // Add "articleimage" class

    // If no image is available, use default logo
    if (article.urlToImage == "null" || article.urlToImage == null) {
      articleimage.style.cssText = `
        background-image: url(${browser.runtime.getURL(LogoLightOutline)}); // Set default image
        width: 20%;
        margin: 0 7.5%;
      `;
    } else {
      articleimage.style.backgroundImage = `url(${article.urlToImage})`; // Set article image
    }

    const articletext = document.createElement("div"); // Create div for article text
    articletext.classList.add("ArticleText"); // Add "ArticleText" class

    const title = document.createElement("a"); // Create anchor for article title
    title.innerText = article.title; // Set article title
    title.href = article.url; // Set article URL
    title.target = "_blank"; // Open title link in a new tab

    const description = document.createElement("p"); // Create paragraph for article description

    // Truncate description if it's too long
    article.description =
      article.description.length > 400
        ? article.description.substring(0, 400) + "..." // Truncate description to 400 characters
        : article.description;
    description.innerHTML = article.description; // Set description HTML

    // Append title and description to article text container
    articletext.append(title, description);
    // Append image and text to the article container
    newsarticle.append(articleimage, articletext);
    // Append the article to the document fragment
    fragment.append(newsarticle);
  });

  // Append all articles to the news container in a single DOM update
  newscontainer?.append(fragment);

  if (!settingsState.animations) return; // Exit if animations are disabled

  const articles = Array.from(document.querySelectorAll(".NewsArticle")); // Get all articles as an array

  // Animate the articles with a spring-based animation
  animate(
    articles.slice(0, 20), // Animate first 20 articles
    { opacity: [0, 1], y: [10, 0], scale: [0.99, 1] }, // Animation properties
    {
      delay: stagger(0.1), // Stagger animation delays for smooth effect
      type: "spring", // Use spring animation
      stiffness: 341, // Stiffness of the spring
      damping: 20, // Damping for smoothness
      mass: 1, // Mass of the spring
    },
  );
}
