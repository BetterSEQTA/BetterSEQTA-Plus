import stringToHTML from "@/seqta/utils/stringToHTML";
import { openPopup } from "@/seqta/utils/Openers/PopupManager";

/** Grade Analytics privacy — uses the shared BetterSEQTA+ whatsnew popup shell. */
export function openAnalyticsPrivacyPopup() {
  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
        <h1>Privacy notice</h1>
        <p>Grade Analytics on this device</p>
      </div>`,
  ).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
      <div class="whatsnewTextContainer privacyStatement">
        <p style="margin-top: 0;">
          <strong>Your grade history and charts stay on this device.</strong>
          BetterSEQTA+ does not collect or store your analytics on our servers.
        </p>

        <h3>What we store locally</h3>
        <ul style="text-align: left; margin: 10px 0;">
          <li>Assessment results and subjects used for trends, distribution, and the table</li>
          <li>Chart preferences (for example, grade distribution grouping) for your school account</li>
          <li>A cache timestamp so Refresh data knows when to fetch from SEQTA again</li>
        </ul>

        <h3>What we never do</h3>
        <ul style="text-align: left; margin: 10px 0;">
          <li>Upload analytics data to BetterSEQTA Cloud or any BetterSEQTA server</li>
          <li>Include analytics in automatic cloud settings backup or restore</li>
          <li>Send your grades to third-party analytics or tracking services</li>
        </ul>

        <h3>How refresh works</h3>
        <p>
          Refresh data loads released marks directly from SEQTA while you are logged in.
          That traffic is between your browser and your school’s SEQTA site — not to us.
        </p>

        <h3>Clearing your data</h3>
        <p>
          You can remove cached analytics any time by clearing this extension’s storage in
          your browser settings.
        </p>

        <p style="font-weight: 600;">
          General plugin settings (such as cache duration in the Grade Analytics plugin
          panel) may still sync if you use BetterSEQTA Cloud — but never your assessment
          results or charts.
        </p>
      </div>
    `).firstChild as HTMLElement;

  openPopup({
    header,
    content: [text],
    animateSelector: ".whatsnewTextContainer *",
    containerClass: "whatsnewContainer--scrollBody",
  });
}
