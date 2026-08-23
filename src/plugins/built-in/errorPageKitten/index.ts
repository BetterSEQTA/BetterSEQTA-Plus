import type { Plugin } from "@/plugins/core/types";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import kittenPng from "@/resources/error-page/kitten.png";
import styles from "./styles.css?inline";

const KITTEN_IMG = resolveExtensionAssetUrl(kittenPng);
const KITTEN_CLASS = "bsplus-kitten-404";

// The reference page's exact h1 background declarations, in the original
// order. Each engine keeps the last declaration it understands (-webkit in
// Blink, -moz in Gecko, the legacy standard otherwise), so shipping them
// byte-for-byte reproduces the reference banner on every engine. Lives in a
// JS string because the CSS minifier drops vendor-prefixed declarations.
const H1_STRIPE_CSS =
  "html.bsplus-kitten-404 .bsplus-kitten-404>h1{background-image:-moz-repeating-linear-gradient(135deg, rgba(0,0,0,0), rgba(0,0,0,0) 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 16px), -moz-linear-gradient(top, rgba(0,0,0,0), rgba(0,0,0,0.1));background-image:-webkit-repeating-linear-gradient(135deg, rgba(0,0,0,0), rgba(0,0,0,0) 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 16px), -webkit-linear-gradient(top, rgba(0,0,0,0), rgba(0,0,0,0.1));background-image:-o-repeating-linear-gradient(135deg, rgba(0,0,0,0), rgba(0,0,0,0) 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 16px), -o-linear-gradient(top, rgba(0,0,0,0), rgba(0,0,0,0.1));background-image:repeating-linear-gradient(45deg, rgba(0,0,0,0), rgba(0,0,0,0) 8px, rgba(0,0,0,0.05) 8px, rgba(0,0,0,0.05) 16px), linear-gradient(top, rgba(0,0,0,0), rgba(0,0,0,0.1))}";

// The 404 page (legacy and rebranded) is a standalone document built around a
// single `.message` block; the real app mounts a `#container`. Require the
// former and rule out the latter so the plugin never renders inside the app.
function is404Page(): boolean {
  if (document.getElementById("container")) return false;
  const heading = document.querySelector(".message > h1");
  const text = heading?.textContent ?? document.title;
  return /not found/i.test(text) || /404/.test(document.title);
}

function buildCard(): HTMLElement {
  const card = document.createElement("div");
  card.className = KITTEN_CLASS;

  const h1 = document.createElement("h1");
  h1.textContent = "404 Not Found";
  card.appendChild(h1);

  const p1 = document.createElement("p");
  p1.textContent =
    "Sorry — the resource you are looking for could not be found.";
  card.appendChild(p1);

  const p2 = document.createElement("p");
  p2.textContent =
    "If you believe you are seeing this message in error, please contact your IT department.";
  card.appendChild(p2);

  const kitten = document.createElement("div");
  kitten.className = "kitten";

  const kittenLine = document.createElement("p");
  kittenLine.textContent = "I did find this picture of a kitten for you, though!";
  kitten.appendChild(kittenLine);

  const img = document.createElement("img");
  img.src = KITTEN_IMG;
  kitten.appendChild(img);

  const attrib = document.createElement("div");
  attrib.className = "attrib";
  attrib.append("CC-BY-SA ");
  const link = document.createElement("a");
  link.href = "http://www.flickr.com/photos/bibbit/2756165489/";
  link.textContent = "by storyvillegirl";
  attrib.appendChild(link);
  kitten.appendChild(attrib);

  card.appendChild(kitten);

  const seqtaLink = document.createElement("a");
  seqtaLink.href = "http://www.seqta.com.au";
  seqtaLink.textContent = "SEQTA";
  card.appendChild(seqtaLink);

  return card;
}

const errorPageKittenPlugin: Plugin = {
  id: "error-page-kitten",
  name: "Classic 404 Page",
  description: "Brings back SEQTA's old kitten 404 page",
  version: "1.0.0",
  settings: {},
  disableToggle: true,
  defaultEnabled: true,
  styles,

  run: async (_api) => {
    let card: HTMLElement | null = null;
    let hasBuilt = false;
    let originalTitle = document.title;
    let stripeStyle: HTMLStyleElement | null = null;

    const render = () => {
      if (!is404Page()) return;

      document.querySelector(".message")?.classList.add("bsplus-kitten-404-hidden");

      if (hasBuilt) return;
      const body = document.body;
      if (!body) return;

      hasBuilt = true;
      document.documentElement.classList.add(KITTEN_CLASS);
      document.title = "404 Not Found";
      // Appended after the manager-injected styles so these same-specificity
      // declarations win over the compiled baseline.
      stripeStyle = document.createElement("style");
      stripeStyle.textContent = H1_STRIPE_CSS;
      document.head.appendChild(stripeStyle);
      card = buildCard();
      body.appendChild(card);
    };

    // Body may not be parsed yet at document_start; render now and again on
    // DOM ready as a safety net.
    render();
    document.addEventListener("DOMContentLoaded", render, { once: true });

    return () => {
      document.removeEventListener("DOMContentLoaded", render);
      document.documentElement.classList.remove(KITTEN_CLASS);
      document
        .querySelectorAll(".bsplus-kitten-404-hidden")
        .forEach((el) => el.classList.remove("bsplus-kitten-404-hidden"));
      document.title = originalTitle;
      stripeStyle?.remove();
      stripeStyle = null;
      card?.remove();
      card = null;
    };
  },
};

export default errorPageKittenPlugin;
