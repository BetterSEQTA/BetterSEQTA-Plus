import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { openPopup } from "./PopupManager";

/** Same hosting pattern as the privacy statement branding images (avoids page-relative extension URLs on Engage). */
const ENGAGE_PROMO_IMG_URL =
  "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/bq%2Bengage.png";

export function shouldShowEngageParentsAnnouncement(): boolean {
  return !settingsState.engageParentsAnnouncementShown;
}

/**
 * One-time announcement that BetterSEQTA Plus works on SEQTA Engage (parents).
 */
export function showEngageParentsAnnouncement(onDismissed?: () => void) {
  if (document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }
  if (!shouldShowEngageParentsAnnouncement()) {
    onDismissed?.();
    return;
  }

  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader engageParentsAnnouncementHeader">
      <h1>BetterSEQTA Plus now supports <span class="seqtaEngageAccent">SEQTA Engage</span></h1>
      <p class="engageParentsSubheading">Buy your mom a BetterSEQTA Plus</p>
    </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer privacyStatement" style="overflow-y: auto; font-size: 1.2rem; line-height: 1.6;">
      <div class="engageParentsPromoWrap">
        <img class="engageParentsPromoImg" src="${ENGAGE_PROMO_IMG_URL}" width="1920" height="1080" alt="BetterSEQTA Plus now supports SEQTA Engage" />
      </div>
      <p>
        <strong class="seqtaEngageAccent">SEQTA Engage</strong> is the portal many parents use for notices, messages, and day-to-day school info.
        Before anything else: BetterSEQTA Plus now supports <strong class="seqtaEngageAccent">SEQTA Engage</strong>, so parents get the same kinds of improvements you are used to on SEQTA Learn—themes, a clearer home experience, and other Plus polish while browsing Engage.
      </p>
      <p>
        The title is a bit of fun; if the extension saves you time, you can always support development via Open Collective or Ko-fi from the What is New changelog or related links in settings.
      </p>
      <p>
        Close this dialog when you are done. We will not show this announcement again.
      </p>
    </div>
  `).firstChild as HTMLElement;

  settingsState.engageParentsAnnouncementShown = true;

  openPopup({
    header,
    content: [text],
    afterClose: onDismissed,
  });
}
