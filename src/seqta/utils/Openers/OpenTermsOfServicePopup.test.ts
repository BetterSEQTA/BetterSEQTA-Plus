/**
 * @jest-environment jsdom
 */
jest.mock("../DevApiBase", () => ({
  getApiBase: () => "https://betterseqta.org",
}));

import {
  getFallbackPrivacyTerms,
  markTermsOfServiceAccepted,
  shouldShowTermsOfServicePopup,
} from "./OpenTermsOfServicePopup";

const SAMPLE_TERMS = {
  last_updated: "2024-06-15T12:00:00Z",
  whatsnew_html: "<div class=\"whatsnewTextContainer\"><p>Terms body</p></div>",
};

describe("shouldShowTermsOfServicePopup", () => {
  it("shows when the user has never accepted", () => {
    expect(
      shouldShowTermsOfServicePopup({ termsOfServiceLastAccepted: undefined }, SAMPLE_TERMS),
    ).toBe(true);
  });

  it("shows when the remote policy was updated after acceptance", () => {
    expect(
      shouldShowTermsOfServicePopup(
        { termsOfServiceLastAccepted: "2024-01-01T00:00:00Z" },
        SAMPLE_TERMS,
      ),
    ).toBe(true);
  });

  it("does not show when the user accepted the current version", () => {
    expect(
      shouldShowTermsOfServicePopup(
        { termsOfServiceLastAccepted: SAMPLE_TERMS.last_updated },
        SAMPLE_TERMS,
      ),
    ).toBe(false);
  });

  it("treats legacy privacy acceptance as terms acceptance", () => {
    expect(
      shouldShowTermsOfServicePopup(
        {
          privacyStatementShown: true,
          privacyStatementLastUpdated: SAMPLE_TERMS.last_updated,
        },
        SAMPLE_TERMS,
      ),
    ).toBe(false);
  });
});

describe("markTermsOfServiceAccepted", () => {
  it("stores the accepted version and legacy privacy flags", () => {
    const state = {
      termsOfServiceLastAccepted: undefined as string | undefined,
      privacyStatementShown: false,
      privacyStatementLastUpdated: undefined as string | undefined,
    };

    markTermsOfServiceAccepted(state, SAMPLE_TERMS.last_updated);

    expect(state.termsOfServiceLastAccepted).toBe(SAMPLE_TERMS.last_updated);
    expect(state.privacyStatementShown).toBe(true);
    expect(state.privacyStatementLastUpdated).toBe(SAMPLE_TERMS.last_updated);
  });
});

describe("getFallbackPrivacyTerms", () => {
  it("returns bundled fallback content when the API is unavailable", () => {
    const fallback = getFallbackPrivacyTerms();
    expect(fallback.last_updated).toBeTruthy();
    expect(fallback.whatsnew_html).toContain("whatsnewTextContainer");
  });
});
