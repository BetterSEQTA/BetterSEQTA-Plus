import stringToHTML from "../stringToHTML";
import { openPopup } from "./PopupManager";

export function OpenPrivacyStatement() {
  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
        <h1>Privacy Statement</h1>
        <p>Our commitment to your privacy</p>
      </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
      <div class="whatsnewTextContainer" style="overflow-y: auto; max-height: 60vh;">
        <h2 style="margin-top: 0;">Privacy Policy</h2>
        <p>At BetterSEQTA+, we take your privacy seriously. We want to be completely transparent about how we handle your data.</p>
        
        <h3>Data Collection</h3>
        <p><strong>We never collect any information from you.</strong> BetterSEQTA+ is designed to work entirely on your device. All processing happens locally in your browser, and we do not send any data to external servers.</p>
        
        <h3>What We Don't Do</h3>
        <ul style="text-align: left; margin: 10px 0;">
          <li>We do not track your browsing activity</li>
          <li>We do not collect personal information</li>
          <li>We do not store your SEQTA credentials</li>
          <li>We do not send data to third-party services</li>
          <li>We do not use analytics or tracking cookies</li>
        </ul>
        
        <h3>Local Storage</h3>
        <p>BetterSEQTA+ uses your browser's local storage to save your preferences and settings. This data remains on your device and is never transmitted anywhere. You can clear this data at any time through your browser's settings.</p>
        
        <h3>Open Source</h3>
        <p>BetterSEQTA+ is an open-source project. You can review our code on <a href="https://github.com/BetterSEQTA/BetterSEQTA-Plus" target="_blank" style="color: inherit; text-decoration: underline;">GitHub</a> to verify our privacy practices. We believe in transparency and encourage you to inspect the code yourself.</p>
        
        <h3>Our Commitment</h3>
        <p>We are committed to providing the best features possible while respecting your privacy. We understand that schools and students have concerns about data privacy, and we want to assure you that BetterSEQTA+ is designed with privacy as a core principle.</p>
        
        <p style="margin-top: 20px; font-weight: bold;">If you have any questions or concerns about our privacy practices, please reach out to us through our <a href="https://github.com/BetterSEQTA/BetterSEQTA-Plus" target="_blank" style="color: inherit; text-decoration: underline;">GitHub repository</a>.</p>
      </div>
    `).firstChild as HTMLElement;

  openPopup({
    header,
    content: [text],
  });
}

