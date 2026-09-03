/**
 * @jest-environment jsdom
 */
import {
  markCoursesAssessmentsFixPopupSeen,
  reEnableBetterSeqtaFeatures,
  shouldOfferCoursesAssessmentsReEnable,
  shouldShowCoursesAssessmentsFixPopup,
} from "./OpenCoursesAssessmentsFixPopup";

describe("shouldShowCoursesAssessmentsFixPopup", () => {
  it("shows when BetterSEQTA features are off and the popup has not been seen", () => {
    expect(
      shouldShowCoursesAssessmentsFixPopup({
        onoff: false,
        coursesAssessmentsFixPopupShown: false,
      }),
    ).toBe(true);
  });

  it("does not show when BetterSEQTA features are on unless What's New just closed", () => {
    expect(
      shouldShowCoursesAssessmentsFixPopup({
        onoff: true,
        coursesAssessmentsFixPopupShown: false,
      }),
    ).toBe(false);
  });

  it("shows after What's New even when BetterSEQTA features are already on", () => {
    expect(
      shouldShowCoursesAssessmentsFixPopup(
        {
          onoff: true,
          coursesAssessmentsFixPopupShown: false,
        },
        { afterWhatsNew: true },
      ),
    ).toBe(true);
  });

  it("does not show again after the user has seen it", () => {
    expect(
      shouldShowCoursesAssessmentsFixPopup(
        {
          onoff: false,
          coursesAssessmentsFixPopupShown: true,
        },
        { afterWhatsNew: true },
      ),
    ).toBe(false);
  });
});

describe("shouldOfferCoursesAssessmentsReEnable", () => {
  it("offers re-enable only when BetterSEQTA features are off", () => {
    expect(shouldOfferCoursesAssessmentsReEnable({ onoff: false })).toBe(true);
    expect(shouldOfferCoursesAssessmentsReEnable({ onoff: true })).toBe(false);
  });
});

describe("markCoursesAssessmentsFixPopupSeen", () => {
  it("persists that the popup has been seen", () => {
    const state = {
      onoff: false,
      coursesAssessmentsFixPopupShown: false,
    };

    markCoursesAssessmentsFixPopupSeen(state);

    expect(state.coursesAssessmentsFixPopupShown).toBe(true);
  });
});

describe("reEnableBetterSeqtaFeatures", () => {
  it("turns features on, marks the popup seen, persists, then reloads", async () => {
    const state = {
      onoff: false,
      coursesAssessmentsFixPopupShown: false,
    };
    const persist = jest.fn().mockResolvedValue(undefined);
    const reload = jest.fn();

    await reEnableBetterSeqtaFeatures({ state, persist, reload });

    expect(state.onoff).toBe(true);
    expect(state.coursesAssessmentsFixPopupShown).toBe(true);
    expect(persist).toHaveBeenCalledWith({
      onoff: true,
      coursesAssessmentsFixPopupShown: true,
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(persist.mock.invocationCallOrder[0]).toBeLessThan(
      reload.mock.invocationCallOrder[0],
    );
  });
});
