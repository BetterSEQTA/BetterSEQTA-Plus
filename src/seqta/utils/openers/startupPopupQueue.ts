import { settingsState } from "../listeners/settingsState";
import { OpenWhatsNewPopup } from "./openWhatsNewPopup";
import {
  fetchThemeOfTheMonth,
  OpenThemeOfTheMonthPopup,
  shouldShowThemeOfTheMonth,
} from "./openThemeOfTheMonthPopup";
import { maybeQueueFeedbackReplyPopup } from "./openFeedbackReplyPopup";
import {
  OpenCoursesAssessmentsFixPopup,
  shouldShowCoursesAssessmentsFixPopup,
} from "./openCoursesAssessmentsFixPopup";
import { cloudAuth } from "../cloudAuth";
import {
  fetchTermsOfService,
  openTermsOfServicePopup,
  shouldShowTermsOfServicePopup,
} from "./openTermsOfServicePopup";

type QueueStep = (goNext: () => void) => void;

export async function runStartupPopupQueue() {
  const steps: QueueStep[] = [];

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
