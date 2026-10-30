import semver from "semver";
import browser from "webextension-polyfill";
import { settingsState } from "../listeners/SettingsState";
import { OpenWhatsNewPopup } from "./OpenWhatsNewPopup";
import {
  fetchThemeOfTheMonth,
  OpenThemeOfTheMonthPopup,
  shouldShowThemeOfTheMonth,
} from "./OpenThemeOfTheMonthPopup";
import { maybeQueueFeedbackReplyPopup } from "./OpenFeedbackReplyPopup";
import {
  OpenCoursesAssessmentsFixPopup,
  shouldShowCoursesAssessmentsFixPopup,
} from "./OpenCoursesAssessmentsFixPopup";
import { syncApiBaseToBackground } from "../DevApiBase";
import { cloudAuth } from "../CloudAuth";
import {
  fetchTermsOfService,
  openTermsOfServicePopup,
  shouldShowTermsOfServicePopup,
} from "./OpenTermsOfServicePopup";
import { getCampaignSeen, getRemoteConfigSnapshot } from "@/seqta/utils/remoteConfig/runtime";
import type { RemoteCampaign } from "@/seqta/utils/remoteConfig/types";
import { openRemoteCampaignPopup } from "./openRemoteCampaignPopup";

type QueueStep = (goNext: () => void) => void;

function remoteCampaignSteps(): QueueStep[] {
  const now = Date.now();
  const version = browser.runtime.getManifest().version;
  const seen = getCampaignSeen();

  return [...getRemoteConfigSnapshot().campaigns]
    .filter((c) => {
      if (!c.id) return false;
      if (c.activeFrom && now < Date.parse(c.activeFrom)) return false;
      if (c.activeTo && now > Date.parse(c.activeTo)) return false;
      const hit = seen[c.id];
      if (hit && (!c.requireAcknowledge || hit.ack)) return false;
      if (c.minVersion && semver.valid(version) && semver.lt(version, c.minVersion)) return false;
      if (c.maxVersion && semver.valid(version) && semver.gt(version, c.maxVersion)) return false;
      return true;
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .map((campaign: RemoteCampaign) => (goNext: () => void) => {
      openRemoteCampaignPopup(campaign, goNext);
    });
}

export async function runStartupPopupQueue() {
  syncApiBaseToBackground();

  const steps: QueueStep[] = [...remoteCampaignSteps()];

  if (settingsState.justupdated) {
    steps.push((goNext) => OpenWhatsNewPopup(goNext));
  }

  if (shouldShowCoursesAssessmentsFixPopup(settingsState)) {
    steps.push((goNext) => OpenCoursesAssessmentsFixPopup(goNext));
  }

  const themeOfTheMonth = await fetchThemeOfTheMonth();
  if (shouldShowThemeOfTheMonth(themeOfTheMonth)) {
    steps.push((goNext) => {
      void OpenThemeOfTheMonthPopup(themeOfTheMonth!, goNext);
    });
  }

  const feedbackReplyStep = await maybeQueueFeedbackReplyPopup();
  if (feedbackReplyStep) steps.push(feedbackReplyStep);

  steps.push((goNext) => {
    void (async () => {
      if (!(await cloudAuth.getStoredToken())) {
        goNext();
        return;
      }
      const termsDocument = await fetchTermsOfService();
      if (!shouldShowTermsOfServicePopup(settingsState, termsDocument)) {
        goNext();
        return;
      }
      await openTermsOfServicePopup(goNext, { terms: termsDocument });
    })();
  });

  function runNext() {
    const step = steps.shift();
    if (step) step(runNext);
  }

  runNext();
}
