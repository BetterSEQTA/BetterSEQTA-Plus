import stringToHTML from "../stringToHTML";
import { closePopup, openPopup } from "./PopupManager";
import { createPopupHeroVideo } from "./attachPopupMediaFullscreen";
import { markCampaignSeen } from "@/seqta/utils/remoteConfig/runtime";
import type { RemoteCampaign } from "@/seqta/utils/remoteConfig/types";
import { requestSettingsDestination } from "@/seqta/utils/settingsNavigation";
import { openSettingsPopup } from "@/seqta/utils/setupSettingsButton";

export function openRemoteCampaignPopup(
  campaign: RemoteCampaign,
  onDismissed?: () => void,
): void {
  const title = campaign.header?.title ?? "BetterSEQTA+";
  const subtitle = campaign.header?.subtitle ?? "";
  let acknowledged = false;

  const header = stringToHTML(
    /* html */ `<div class="whatsnewHeader"><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}</div>`,
  ).firstChild as HTMLElement;

  const buttons = campaign.buttons?.length
    ? campaign.buttons
    : [{ id: "dismiss", label: "Dismiss", action: "dismiss" as const }];

  const actionsHtml = buttons
    .map(
      (btn, i) =>
        `<button type="button" id="bsplus-campaign-${campaign.id}-${btn.id}" class="bsplus-cal-btn ${i === 0 ? "bsplus-cal-btn--primary" : "bsplus-cal-btn--ghost"}">${btn.label}</button>`,
    )
    .join("");

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer bsplus-founder-badge-body" style="overflow-y: auto;">
      <div class="bsplus-campaign-body"></div>
      <div class="bsplus-founder-badge-actions">${actionsHtml}</div>
    </div>
  `).firstChild as HTMLElement;

  const bodySlot = text.querySelector(".bsplus-campaign-body");
  if (bodySlot && campaign.bodyHtml) bodySlot.innerHTML = campaign.bodyHtml;

  const content: HTMLElement[] = [];
  const hero = campaign.hero;
  if (hero?.url) {
    if (hero.type === "video") {
      content.push(createPopupHeroVideo(hero.url, hero.alt ?? ""));
    } else {
      const wrap = stringToHTML(/* html */ `<div class="whatsnewImgContainer"></div>`)
        .firstChild as HTMLElement;
      const img = document.createElement("img");
      img.src = hero.url;
      img.alt = hero.alt ?? "";
      img.className = "whatsnewImg";
      img.loading = "lazy";
      wrap.append(img);
      content.push(wrap);
    }
  }
  content.push(text);

  const actions = buttons.map((btn) => ({
    id: `bsplus-campaign-${campaign.id}-${btn.id}`,
    onClick: async () => {
      if (btn.action === "url" && btn.url) {
        window.open(btn.url, "_blank", "noopener,noreferrer");
      } else if (btn.action === "openSettingsSection" && btn.section) {
        requestSettingsDestination({ section: btn.section });
        await openSettingsPopup();
      }
      if (campaign.requireAcknowledge) acknowledged = true;
      await closePopup();
    },
  }));

  openPopup({
    header,
    content,
    animateSelector: ".whatsnewImgContainer, .whatsnewTextContainer *",
    actions,
    afterClose: () => {
      void markCampaignSeen(
        campaign.id,
        campaign.requireAcknowledge ? acknowledged : undefined,
      );
      onDismissed?.();
    },
  });
}
