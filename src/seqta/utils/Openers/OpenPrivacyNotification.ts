import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { openPopup } from "./PopupManager";

export function showPrivacyNotification() {
  const lastUpdated = "2025-12-19";

  if (document.getElementById("whatsnewbk")) return;
  if (settingsState.privacyStatementShown) return;
  if (settingsState.privacyStatementLastUpdated && new Date(settingsState.privacyStatementLastUpdated) > new Date(lastUpdated)) return;

  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
      <h1>Privacy Statement</h1>
      <p>Important Information</p>
    </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer privacyStatement" style="overflow-y: auto; font-size: 1.2rem; line-height: 1.6;">
    <img style="aspect-ratio: 16/5.8;" src="${settingsState.DarkMode ? "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/branding/dark.jpg" : "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/main/src/resources/branding/light.jpg"}" class="aboutImg" />
      <p>
        <strong>Addressing Recent Concerns About BetterSEQTA+</strong><br>
        We appreciate the feedback we've received from several schools regarding BetterSEQTA+. Transparency and trust are core to our mission, and we want to address these concerns directly.
      </p>
      <p>
        <strong>Our Commitment to Privacy:</strong><br>
        <span style="display: block; margin-left: 1em;">
          • We do not collect, store, or share any personal information<br>
          • All data processing happens locally on your device<br>
          • Our code is open source and available for review
        </span>
      </p>
      <p>
        <strong>What We're Doing:</strong><br>
        We're willing to actively work with school administrators to ensure BetterSEQTA+ meets both student needs and institutional requirements. If your school has specific concerns, we encourage them to contact us at <a href="mailto:betterseqta.plus@gmail.com" style="color: inherit; text-decoration: underline;">betterseqta.plus@gmail.com</a> or via github at <a href="https://github.com/BetterSEQTA/BetterSEQTA-Plus" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">github.com/BetterSEQTA/BetterSEQTA-Plus</a>.
      </p>
      <p>
        For complete details about our privacy practices, visit our <a href="https://betterseqta.org/privacy" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">privacy policy</a> or click the shield icon in settings.
      </p>
    </div>
  `).firstChild as HTMLElement;

  settingsState.privacyStatementLastUpdated = "2025-12-20";
  settingsState.privacyStatementShown = true;

  openPopup({
    header,
    content: [text],
  });
}
