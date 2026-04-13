import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { openPopup } from "./PopupManager";
import { attachPopupMediaFullscreen } from "./attachPopupMediaFullscreen";

/** Same hosting pattern as the What's New update video (GitHub raw). */
const BS_CLOUD_DEMO_VIDEO_URL =
  "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/bsclouddemo.webm";

export function shouldShowBsCloudAutoSyncAnnouncement(): boolean {
  return !settingsState.bsCloudAutoSyncAnnouncementShown;
}

/**
 * One-time announcement for BetterSEQTA Cloud automatic settings sync (after other startup popups).
 * Video layout matches {@link OpenWhatsNewPopup} (`whatsnewImgContainer` / `whatsnewImg`).
 */
export function showBsCloudAutoSyncAnnouncement(onDismissed?: () => void) {
  if (document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }
  if (!shouldShowBsCloudAutoSyncAnnouncement()) {
    onDismissed?.();
    return;
  }

  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader bsCloudAutoSyncAnnouncementHeader">
      <h1>BetterSEQTA Cloud</h1>
    </div>`,
  ).firstChild as HTMLElement;

  const imageContainer = document.createElement("div");
  imageContainer.classList.add("whatsnewImgContainer");

  const video = document.createElement("video");
  const source = document.createElement("source");
  source.setAttribute("src", BS_CLOUD_DEMO_VIDEO_URL);
  source.setAttribute("type", "video/webm");
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.appendChild(source);
  video.classList.add("whatsnewImg");
  imageContainer.appendChild(video);
  attachPopupMediaFullscreen(video);

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer privacyStatement" style="height: 50%; overflow-y: auto; font-size: 1.2rem; line-height: 1.6;">
      <p>
        <strong class="bsCloudAccent">BetterSEQTA Cloud</strong> can keep your BetterSEQTA+ settings backed up and in
        sync across browsers. Optional <strong>automatic settings sync</strong> runs when you are signed in (passwords
        and tokens are never included).
      </p>
      <p>
        Close this dialog when you are done. We will not show this announcement again.
      </p>
      <p class="bsCloudAutoSyncSignupCallout">Sign up in BetterSEQTA settings</p>
    </div>
  `).firstChild as HTMLElement;

  settingsState.bsCloudAutoSyncAnnouncementShown = true;

  openPopup({
    header,
    content: [imageContainer, text],
    afterClose: onDismissed,
  });
}
