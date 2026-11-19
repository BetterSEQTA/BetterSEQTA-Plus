import { settingsState } from "../listeners/settingsState";
import { openWhatsNewPopup } from "./openWhatsNewPopup";
import {
  fetchThemeOfTheMonth,
  openThemeOfTheMonthPopup,
  shouldShowThemeOfTheMonth,
} from "./openThemeOfTheMonthPopup";
import { maybeQueueFeedbackReplyPopup } from "./openFeedbackReplyPopup";
import {
  openCoursesAssessmentsFixPopup,
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
    steps.push((goNext) => openWhatsNewPopup(goNext));
  }

  if (shouldShowCoursesAssessmentsFixPopup(settingsState)) {
    steps.push((goNext) => openCoursesAssessmentsFixPopup(goNext));
  }

  const themeOfTheMonth = await fetchThemeOfTheMonth();
  if (shouldShowThemeOfTheMonth(themeOfTheMonth)) {
    steps.push((goNext) => {
      void openThemeOfTheMonthPopup(themeOfTheMonth!, goNext);
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
