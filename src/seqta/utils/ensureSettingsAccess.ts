import { icon } from "@/lib/icon";
import { Wrench } from "lucide-static";
import stringToHTML from "@/seqta/utils/stringToHTML";
import { addExtensionSettings } from "@/seqta/utils/adders/addExtensionSettings";
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
          ${icon(Wrench)}
        </button>
      `).firstChild!,
    );
    setupSettingsButton();
  });
}
