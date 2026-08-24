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

/** Boot path in SEQTA.ts gates when this runs; keep render-only here. */
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
  run: async () => mountErrorPageKitten(),
};

export default errorPageKittenPlugin;
