import stringToHTML from "../stringToHTML";
import browser from "webextension-polyfill";
import { openPopup } from "./PopupManager";
import { attachPopupMediaFullscreen } from "./attachPopupMediaFullscreen";
import { createPopupSocialFooter } from "./createPopupSocialFooter";
import { renderWhatsNewChangelogHtml } from "./whatsNewChangelog";
import updateVideo from "@/resources/update-video.webm";

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

  const heroVideo = document.createElement("video");
  heroVideo.src = updateVideo;
  heroVideo.classList.add("whatsnewImg");
  heroVideo.autoplay = true;
  heroVideo.muted = true;
  heroVideo.loop = true;
  heroVideo.playsInline = true;
  heroVideo.setAttribute("playsinline", "");
  heroVideo.setAttribute("aria-label", "BetterSEQTA+ update preview");
  imageContainer.appendChild(heroVideo);
  attachPopupMediaFullscreen(heroVideo);
  void heroVideo.play().catch(() => {});

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
