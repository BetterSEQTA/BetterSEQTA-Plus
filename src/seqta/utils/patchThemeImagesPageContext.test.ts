import { CUSTOM_THEME_PAGE_COMPAT_CSS } from "@/seqta/utils/customThemePageCompatCss";

describe("custom theme page compat", () => {
  it("includes assessment and course safeguards", () => {
    expect(CUSTOM_THEME_PAGE_COMPAT_CSS).toContain("#main > .course");
    expect(CUSTOM_THEME_PAGE_COMPAT_CSS).toContain("BasicPanel__BasicPanel___");
    expect(CUSTOM_THEME_PAGE_COMPAT_CSS).toContain("assessmentsWrapper");
  });
});
