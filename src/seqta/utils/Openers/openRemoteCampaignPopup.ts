import stringToHTML from "../stringToHTML";
import { closePopup, openPopup } from "./PopupManager";
import { createPopupHeroVideo } from "./attachPopupMediaFullscreen";
import { markCampaignSeen } from "@/seqta/utils/remoteConfig/runtime";
import type { RemoteCampaign } from "@/seqta/utils/remoteConfig/types";
import { requestSettingsDestination } from "@/seqta/utils/settingsNavigation";
import { openSettingsPopup } from "@/seqta/utils/setupSettingsButton";

function campaignHero(campaign: RemoteCampaign): HTMLElement | null {
  const hero = campaign.hero;
  if (!hero?.url) return null;
  if (hero.type === "video") {
    return createPopupHeroVideo(hero.url, hero.alt ?? "");
  }
  const img = document.createElement("img");
  img.src = hero.url;
  img.alt = hero.alt ?? "";
  img.className = "whatsnewHeroImage";
  img.loading = "lazy";
  return img;
}

export function openRemoteCampaignPopup(
  campaign: RemoteCampaign,
  onDismissed?: () => void,
): void {
  const title = campaign.header?.title ?? "BetterSEQTA+";
  const subtitle = campaign.header?.subtitle ?? "";

  const header = stringToHTML(
    /* html */ `<div class="whatsnewHeader"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>`,
  ).firstChild as HTMLElement;

  const body = stringToHTML(/* html */ `<div class="whatsnewTextContainer"></div>`)
    .firstChild as HTMLElement;
  if (campaign.bodyHtml) body.innerHTML = campaign.bodyHtml;

  const buttons = campaign.buttons?.length
    ? campaign.buttons
    : [{ id: "dismiss", label: "Dismiss", action: "dismiss" as const }];

  const footer = stringToHTML(
    /* html */ `<div class="bsplus-campaign-actions flex flex-wrap gap-2 justify-end p-4">${buttons
      .map(
        (btn) =>
          `<button type="button" id="bsplus-campaign-${campaign.id}-${btn.id}" class="bsplus-tos-btn bsplus-tos-btn--primary">${btn.label}</button>`,
      )
      .join("")}</div>`,
  ).firstChild as HTMLElement;

  const content: HTMLElement[] = [];
  const hero = campaignHero(campaign);
  if (hero) content.push(hero);
  content.push(body, footer);

  const actions = buttons.map((btn) => ({
    id: `bsplus-campaign-${campaign.id}-${btn.id}`,
    onClick: async () => {
      if (btn.action === "url" && btn.url) {
        window.open(btn.url, "_blank", "noopener,noreferrer");
      } else if (btn.action === "openSettingsSection" && btn.section) {
        requestSettingsDestination({ section: btn.section });
        await openSettingsPopup();
      }
      await markCampaignSeen(campaign.id, campaign.requireAcknowledge === true);
      await closePopup();
    },
  }));

  openPopup({
    header,
    content,
    actions,
    afterClose: () => {
      void markCampaignSeen(campaign.id);
      onDismissed?.();
    },
  });
}
