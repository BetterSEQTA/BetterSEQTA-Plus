import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/settingsState";
import { openPopup } from "./popupManager";
import { createPopupSocialFooter } from "./createPopupSocialFooter";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import brandingDark from "@/resources/branding/dark.jpg";
import brandingLight from "@/resources/branding/light.jpg";

export function openAboutPage() {
  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
        <h1>About</h1>
        <p>About the extension</p>
      </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
      <div class="whatsnewTextContainer" style="overflow-y: hidden;">
        <img src="${resolveExtensionAssetUrl(settingsState.DarkMode ? brandingDark : brandingLight)}" class="aboutImg" alt="BetterSEQTA+" />
        <p>BetterSEQTA+ is a fork of BetterSEQTA (originally developed by Nulkem), which was discontinued. BetterSEQTA+ continued development of BetterSEQTA, while incorporating a plethora of features. </p>
        <p>We are currently working on fixing bugs and adding useful features. If you want to make a feature request or report a bug, you can do so on GitHub (find icon below). We are always looking for more contributors!</p>
        <h1>Credits:</h1>
        <p style="margin: 0;">
  Nulkem created the original extension, was ported to Manifest V3 by MEGA-Dawg68, and is under active development by Crazypersonalph, SethBurkart123, and other contributors.
</p>
  <h1 style="text-align: left; font-weight: bold; margin: 0;">
    All Contributors:
  </h1>
<div style="max-width: 600px; margin: auto;">
  <img
    src="https://contrib.rocks/image?repo=BetterSEQTA/BetterSEQTA-Plus&columns=10"
    style="width: 100%; max-width: 500px; height: auto; object-fit: contain; display: block; margin: -80px auto 0;">
</div>
      </div>
    `).firstChild as HTMLElement;

  const footer = createPopupSocialFooter();

  openPopup({
    header,
    content: [text, footer],
  });
}
