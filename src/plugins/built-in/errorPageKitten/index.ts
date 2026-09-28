import type { Plugin } from "@/plugins/core/types";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import kittenPng from "@/resources/error-page/kitten.png";
import styles from "./styles.css?inline";

const KITTEN_IMG = resolveExtensionAssetUrl(kittenPng);
const ROOT_CLASS = "bsplus-kitten-404";

const CARD_HTML = `<h1>404 Not Found</h1>
<p>Sorry — the resource you are looking for could not be found.</p>
<p>If you believe you are seeing this message in error, please contact your IT department.</p>
<div class="kitten">
  <p>I did find this picture of a kitten for you, though!</p>
  <img src="${KITTEN_IMG}" alt="">
  <div class="attrib">CC-BY-SA <a href="http://www.flickr.com/photos/bibbit/2756165489/">by storyvillegirl</a></div>
</div>
<a href="http://www.seqta.com.au">SEQTA</a>`;

function normalizePageText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fingerprints SEQTA's rebranded standalone 404 — not generic site 404s. */
function isSeqtaRebranded404Message(message: Element): boolean {
  const heading = message.querySelector("h1");
  if (normalizePageText(heading?.textContent ?? "").toLowerCase() !== "page not found") {
    return false;
  }

  const body = normalizePageText(message.textContent ?? "");
  return (
    body.includes("We can't find the page you're looking for") &&
    body.includes(
      "It may have been moved, deleted or the link might be out of date.",
    ) &&
    body.includes("Ref: 404")
  );
}

/** Standalone SEQTA 404 document — not the SPA (#container). */
export function isSeqta404Page(): boolean {
  if (document.getElementById("container")) return false;
  const message = document.querySelector(".message");
  if (!message) return false;
  return isSeqtaRebranded404Message(message);
}

export function mountErrorPageKitten(): () => void {
  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const originalTitle = document.title;
  document.querySelector(".message")?.classList.add("bsplus-kitten-404-hidden");
  document.documentElement.classList.add(ROOT_CLASS);
  document.title = "404 Not Found";

  const card = document.createElement("div");
  card.className = ROOT_CLASS;
  card.innerHTML = CARD_HTML;
  document.body.appendChild(card);

  return () => {
    styleEl.remove();
    document.documentElement.classList.remove(ROOT_CLASS);
    document
      .querySelectorAll(".bsplus-kitten-404-hidden")
      .forEach((el) => el.classList.remove("bsplus-kitten-404-hidden"));
    document.title = originalTitle;
    card.remove();
  };
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
  run: async () => (isSeqta404Page() ? mountErrorPageKitten() : () => {}),
};

export default errorPageKittenPlugin;
