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

type QueueStep = (goNext: () => void) => void;

/**
 * Runs startup modals in order: What's New (if the extension just updated),
 * Courses/Assessments fix notice (after What's New, or if features are off),
 * Theme of the Month (when the user hasn't dismissed this calendar month),
 * then feedback reply notifications for pending submissions.
 */
export async function runStartupPopupQueue() {
  // Make sure the background script knows about any dev-mode API override
  // before we start firing requests.
  syncApiBaseToBackground();

  const steps: QueueStep[] = [];
  const afterWhatsNew = !!settingsState.justupdated;

  if (afterWhatsNew) {
    steps.push((goNext) => OpenWhatsNewPopup(goNext));
  }

  if (
    shouldShowCoursesAssessmentsFixPopup(settingsState, {
      afterWhatsNew,
    })
  ) {
    steps.push((goNext) =>
      OpenCoursesAssessmentsFixPopup(goNext, { afterWhatsNew }),
    );
  }

  // Fetch the Theme of the Month before queueing so we don't show an empty
  // popup if the network or server is unavailable.
  const themeOfTheMonth = await fetchThemeOfTheMonth();
  if (shouldShowThemeOfTheMonth(themeOfTheMonth)) {
    steps.push((goNext) => {
      void OpenThemeOfTheMonthPopup(themeOfTheMonth!, goNext);
    });
  }

  const feedbackReplyStep = await maybeQueueFeedbackReplyPopup();
  if (feedbackReplyStep) {
    steps.push(feedbackReplyStep);
  }

  function runNext() {
    const step = steps.shift();
    if (step) step(runNext);
  }

  runNext();
}
