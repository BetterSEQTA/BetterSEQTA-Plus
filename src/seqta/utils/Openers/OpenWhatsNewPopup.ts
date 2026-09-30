import stringToHTML from "../stringToHTML";
import browser from "webextension-polyfill";
import { openPopup } from "./PopupManager";
import { createPopupHeroVideo } from "./attachPopupMediaFullscreen";
import { createPopupSocialFooter } from "./createPopupSocialFooter";
import { renderWhatsNewChangelogHtml } from "./whatsNewChangelog";

const UPDATE_VIDEO_URL =
  "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/update-video.webm";

export function OpenWhatsNewPopup(onDismissed?: () => void) {
  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
        <h1>What's New</h1>
        <p>BetterSEQTA+ V${browser.runtime.getManifest().version}</p>
      </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer" style="height: 50%;overflow-y: auto;">

      ${renderWhatsNewChangelogHtml()}
    </div>
    `).firstChild as HTMLElement;

  const footer = createPopupSocialFooter({ kofi: true });

  openPopup({
    header,
    content: [
      createPopupHeroVideo(UPDATE_VIDEO_URL, "BetterSEQTA+ update preview"),
      text,
      footer,
    ],
    afterClose: onDismissed,
    clearJustUpdated: true,
  });
}
