import stringToHTML from "@/seqta/utils/stringToHTML";
import { closePopup, openPopup } from "@/seqta/utils/Openers/PopupManager";
import { openFounderBadgeSettings } from "@/seqta/ui/founderBadge/openFounderBadgeSettings";
import {
  founderBadgeChipHtml,
  tierBlobStyle,
  tierForBadgeKey,
  type FounderBadgeItem,
} from "@/seqta/utils/founderBadges";

const ACCOUNTS_URL = "https://accounts.betterseqta.org";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function openFounderBadgeModal(
  badge: FounderBadgeItem,
  signupNumber?: number | null,
): void {
  const tier = tierForBadgeKey(badge.key);
  if (!tier) return;

  const header = stringToHTML(/* html */ `
    <div class="whatsnewHeader bsplus-founder-badge-header">
      <h1>${esc(badge.label)}</h1>
      <p>${esc(tier.rankLabel)}</p>
    </div>
  `).firstChild as HTMLElement;

  const signupLine =
    signupNumber != null
      ? `<p class="bsplus-founder-badge-signup">Cloud user #${signupNumber.toLocaleString()}</p>`
      : "";

  const hero = stringToHTML(/* html */ `
    <div class="whatsnewImgContainer">
      <div class="bsplus-founder-badge-hero whatsnewImg" data-tier="${badge.key}" style="${tierBlobStyle(tier)}">
        <div class="bsplus-founder-badge-hero__blobs" aria-hidden="true"></div>
        <div class="bsplus-founder-badge-hero__vignette" aria-hidden="true"></div>
        <div class="bsplus-founder-badge-hero__stage">
          ${founderBadgeChipHtml(badge, { hero: true })}
        </div>
      </div>
    </div>
  `).firstChild as HTMLElement;

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer bsplus-founder-badge-body" style="overflow-y: auto;">
      <p>${esc(tier.description)}</p>
      <p>
        Linked to your BetterSEQTA Cloud account at
        <a href="${ACCOUNTS_URL}" target="_blank" rel="noopener noreferrer">accounts.betterseqta.org</a>.
      </p>
      ${signupLine}
      <div class="bsplus-founder-badge-actions">
        <button type="button" id="bsplus-founder-badge-settings-link" class="bsplus-cal-btn bsplus-cal-btn--ghost">
          Hide in settings
        </button>
        <button type="button" id="bsplus-founder-badge-dismiss" class="bsplus-cal-btn bsplus-cal-btn--primary">
          Got it
        </button>
      </div>
    </div>
  `).firstChild as HTMLElement;

  openPopup({
    header,
    content: [hero, text],
    animateSelector: ".whatsnewImgContainer, .whatsnewTextContainer *",
    actions: [
      { id: "bsplus-founder-badge-dismiss", onClick: () => closePopup() },
      {
        id: "bsplus-founder-badge-settings-link",
        onClick: () => void closePopup().then(() => openFounderBadgeSettings()),
      },
    ],
  });
}
