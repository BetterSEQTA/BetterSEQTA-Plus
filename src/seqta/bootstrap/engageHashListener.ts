import { getEngageRoutePage } from "@/seqta/utils/engageRoute";
import {
  loadEngageHomePage,
  updateEngageHomeMenuActive,
} from "@/seqta/utils/Loaders/LoadEngageHomePage";
import { isSeqtaEngageExperience } from "@/seqta/utils/isSeqtaEngage";

let engageHashListenerAttached = false;

export function attachEngageHashListenerIfNeeded(): void {
  if (!isSeqtaEngageExperience() || engageHashListenerAttached) return;
  engageHashListenerAttached = true;
  window.addEventListener("hashchange", () => {
    if (getEngageRoutePage() === "home") {
      void loadEngageHomePage();
    } else {
      updateEngageHomeMenuActive(false);
    }
  });
}
