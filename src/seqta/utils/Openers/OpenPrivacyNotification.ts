import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { animate } from "motion";
import { OpenWhatsNewPopup } from "./OpenWhatsNewPopup";
import DOMPurify from "dompurify";
import browser from "webextension-polyfill";

interface PrivacyPolicyResponse {
  last_updated: string;
  whatsnew_html: string;
}

async function fetchPrivacyPolicy(): Promise<PrivacyPolicyResponse | null> {
  try {
    // Use background script to avoid CORS issues
    const response = await browser.runtime.sendMessage({ type: "fetchPrivacyPolicy" }) as { error: string | null; data: PrivacyPolicyResponse | null };

    if (response.error) {
      console.error("[BetterSEQTA+] Failed to fetch privacy policy:", response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error("[BetterSEQTA+] Error fetching privacy policy:", error);
    return null;
  }
}

export async function checkAndShowPrivacyNotification() {
  if (document.getElementById("privacy-notification")) return;

  // Fetch the privacy policy from the API
  const policyData = await fetchPrivacyPolicy();

  if (!policyData) {
    // If API fails, fall back to showing the notification if never shown
    if (!settingsState.privacyStatementShown) {
      showPrivacyNotificationWithContent(null);
      settingsState.privacyStatementShown = true;
    }
    return;
  }

  // Check if we should show the notification
  const storedTimestamp = settingsState.privacyStatementLastUpdated;
  const shouldShow = !storedTimestamp || 
    new Date(policyData.last_updated) > new Date(storedTimestamp);

  if (shouldShow) {
    // Sanitize the HTML content to prevent XSS attacks
    // DOMPurify will remove any dangerous scripts, event handlers, etc
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // SANITIZE CONTENT: 
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // The content in sanitizedHTML is the only content that is allowed to be displayed in the notification:
    const sanitizedHTML = DOMPurify.sanitize(policyData.whatsnew_html, {
      ALLOWED_TAGS: ['div', 'p', 'strong', 'a', 'h1', 'h2', 'h3', 'ul', 'li', 'span', 'em', 'b', 'i'],
      ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'id'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      // Ensure links are safe - allow https/http/mailto only
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      // Force all external links to have target="_blank" and rel="noopener noreferrer"
      ADD_ATTR: ['target', 'rel'],
    });
    
    // Post-process to sanitize URLs and ensure all links have proper attributes
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sanitizedHTML;

    // First, remove hrefs from links that aren't to betterseqta.org
    tempDiv.querySelectorAll("a").forEach(a => {
      const href = a.getAttribute("href") || "";
      // Allow only links to your domain
      if (!href.startsWith("https://betterseqta.org")) {
        a.removeAttribute("href");       // neuter link
        a.style.textDecoration = "none"; // optional visual fix
        a.style.cursor = "default";      // optional
      } else {
        // Ensure all betterseqta.org links have proper attributes
        (a as HTMLAnchorElement).target = "_blank";
        (a as HTMLAnchorElement).rel = "noopener noreferrer";
      }
    });

    const cleanHTML = tempDiv.innerHTML;

    showPrivacyNotificationWithContent(cleanHTML);
    
    // Update the stored timestamp
    settingsState.privacyStatementLastUpdated = policyData.last_updated;
    settingsState.privacyStatementShown = true;
  }
}

function showPrivacyNotificationWithContent(htmlContent: string | null) {
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

  // Use fetched content if available, otherwise use fallback
  let text: HTMLElement;
  if (htmlContent) {
    // Parse the sanitized HTML
    text = stringToHTML(htmlContent).firstChild as HTMLElement;
  } else {
    // Fallback content if API fails
    text = stringToHTML(/* html */ `
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
  }

  if (header) container.append(header);
  if (text) container.append(text);

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

  // Handle all privacy policy links - ensure they open in new tab
  setTimeout(() => {
    // Find all links that point to the privacy policy
    const allLinks = container.querySelectorAll('a[href*="betterseqta.org/privacy"]');
    allLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const href = (link as HTMLAnchorElement).href || "https://betterseqta.org/privacy";
        window.open(href, "_blank", "noopener,noreferrer");
      });
      // Ensure target and rel attributes are set
      (link as HTMLAnchorElement).target = "_blank";
      (link as HTMLAnchorElement).rel = "noopener noreferrer";
    });
  }, 100);
}

// Legacy function name for backwards compatibility
export function showPrivacyNotification() {
  checkAndShowPrivacyNotification();
}

