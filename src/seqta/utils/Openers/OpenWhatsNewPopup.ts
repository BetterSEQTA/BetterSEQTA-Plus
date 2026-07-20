import stringToHTML from "../stringToHTML";
import browser from "webextension-polyfill";
import { openPopup } from "./PopupManager";
import { attachPopupMediaFullscreen } from "./attachPopupMediaFullscreen";
import { createPopupSocialFooter } from "./createPopupSocialFooter";
import { renderWhatsNewChangelogHtml } from "./whatsNewChangelog";

export function OpenWhatsNewPopup(onDismissed?: () => void) {
  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
        <h1>What's New</h1>
        <p>BetterSEQTA+ V${browser.runtime.getManifest().version}</p>
      </div>`,
  ).firstChild as HTMLElement;

  const imageContainer = document.createElement("div");
  imageContainer.classList.add("whatsnewImgContainer");

  const heroImage = document.createElement("img");
  heroImage.src =
    "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/updateimage1.webp";
  heroImage.alt = "BetterSEQTA+ update preview";
  heroImage.classList.add("whatsnewImg");
  imageContainer.appendChild(heroImage);
  attachPopupMediaFullscreen(heroImage);

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer" style="height: 50%;overflow-y: auto;">

      ${renderWhatsNewChangelogHtml()}
    </div>
    `).firstChild as HTMLElement;

  const footer = createPopupSocialFooter({ kofi: true });

  openPopup({
    header,
    content: [imageContainer, text, footer],
    afterClose: onDismissed,
    clearJustUpdated: true,
  });
}
