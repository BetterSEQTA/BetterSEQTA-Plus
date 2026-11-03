import stringToHTML from "@/seqta/utils/stringToHTML";
import { addExtensionSettings } from "@/seqta/utils/adders/AddExtensionSettings";
import { setupSettingsButton } from "@/seqta/utils/setupSettingsButton";
import { waitForElm } from "@/seqta/utils/waitForElm";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";
import { isPerformanceMode } from "@/seqta/utils/performanceMode";

export async function ensureSettingsAccess(): Promise<void> {
  addExtensionSettings();
  if (document.getElementById("AddedSettings")) {
    setupSettingsButton();
    return;
  }

  const fallback =
    document.getElementById("content") ?? document.getElementById("container") ?? document.body;

  const mountParent = async (): Promise<Element> => {
    if (isSeqtaEngageExperience()) {
      try {
        const el = await waitForElm(
          "#content > div.connectedNotificationsWrapper > div",
          true,
          100,
          40,
        );
        return el.parentElement ?? el;
      } catch {
        return fallback;
      }
    }
    try {
      return await waitForElm(
        "#content > div.connectedNotificationsWrapper",
        true,
        isPerformanceMode() ? 120 : 80,
        50,
      );
    } catch {
      return fallback;
    }
  };

  mountParent().then((parent) => {
    if (document.getElementById("AddedSettings")) return;
    parent.append(
      stringToHTML(/* html */ `
        <button class="addedButton" id="AddedSettings" type="button" aria-label="BetterSEQTA+ settings">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M23.182,6.923c-.29,0-3.662,2.122-4.142,2.4l-2.8-1.555V4.511l4.257-2.456a.518.518,0,0,0,.233-.408.479.479,0,0,0-.233-.407,6.511,6.511,0,1,0-3.327,12.107,6.582,6.582,0,0,0,6.148-4.374,5.228,5.228,0,0,0,.333-1.542A.461.461,0,0,0,23.182,6.923Z"></path>
            <path d="M9.73,10.418,7.376,12.883c-.01.01-.021.016-.03.025L1.158,19.1a2.682,2.682,0,1,0,3.793,3.793l4.583-4.582,0,0,4.1-4.005-.037-.037A9.094,9.094,0,0,1,9.73,10.418ZM3.053,21.888A.894.894,0,1,1,3.946,21,.893.893,0,0,1,3.053,21.888Z"></path>
          </svg>
        </button>
      `).firstChild!,
    );
    setupSettingsButton();
  });
}
