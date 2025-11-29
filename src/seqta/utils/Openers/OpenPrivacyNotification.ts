import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { animate } from "motion";
import { OpenWhatsNewPopup } from "./OpenWhatsNewPopup";

export function showPrivacyNotification() {
  if (document.getElementById("privacy-notification")) return;

  const popupBackground = document.createElement("div");
  popupBackground.id = "privacy-notification";
  popupBackground.classList.add("whatsnewBackground");
  popupBackground.style.zIndex = "10000001";

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");
  container.style.height = "auto";
  container.style.maxWidth = "800px";
  container.style.width = "90%";

  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
      <h1>Privacy Statement</h1>
      <p>Important Information</p>
    </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer" style="overflow-y: auto; font-size: 1.3rem; line-height: 1.6;">
      <p>
        It has come to our attention that several schools have expressed concerns about BetterSEQTA+. This is very disheartening, so we have decided to release a statement on the situation.
      </p>
      <p>
        To view our privacy policy, please click the <strong>shield icon</strong> in the settings&nbsp;menu, or<a href="https://betterseqta.org/privacy" target="_blank" rel="noopener noreferrer" id="privacy-link" style="color: inherit; text-decoration: underline; cursor: pointer; white-space: nowrap;">&nbsp;click here</a>.
      </p>
      <p style="font-weight: bold; margin-top: 15px;">
        We never collect any information from you, and aim to provide the best features possible.
      </p>
    </div>
  `).firstChild as HTMLElement;

  if (header) container.append(header);
  container.append(text);

  const closeButton = document.createElement("div");
  closeButton.id = "whatsnewclosebutton";
  container.append(closeButton);

  popupBackground.append(container);
  document.getElementById("container")?.append(popupBackground);

  if (settingsState.animations) {
    animate([popupBackground as HTMLElement], { opacity: [0, 1] });
  }

  popupBackground.addEventListener("click", (event) => {
    if (event.target === popupBackground) {
      popupBackground.remove();
      // Show what's new if it was waiting
      if (settingsState.justupdated && !document.getElementById("whatsnewbk")) {
        OpenWhatsNewPopup();
      }
    }
  });

  closeButton.addEventListener("click", () => {
    popupBackground.remove();
    // Show what's new if it was waiting
    if (settingsState.justupdated && !document.getElementById("whatsnewbk")) {
      OpenWhatsNewPopup();
    }
  });

  // Handle privacy link click - ensure it opens in new tab
  setTimeout(() => {
    const privacyLink = document.getElementById("privacy-link");
    if (privacyLink) {
      privacyLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.open("https://betterseqta.org/privacy", "_blank", "noopener,noreferrer");
      });
    }
  }, 100);
}

