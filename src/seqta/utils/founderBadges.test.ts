import { badgesForTitlebar } from "./founderBadges";

describe("badgesForTitlebar", () => {
  it("shows one founder plus achievements from API lists", () => {
    expect(
      badgesForTitlebar(
        [
          { key: "founder_1000", label: "Thousand Club" },
          { key: "theme_submitter", label: "Theme Submitter" },
        ],
        842,
      ).map((b) => b.key),
    ).toEqual(["founder_1000", "theme_submitter"]);
  });

  it("derives founder from signup_number when the API omits the founder row", () => {
    expect(
      badgesForTitlebar([{ key: "theme_submitter", label: "Theme Submitter" }], 42).map(
        (b) => b.key,
      ),
    ).toEqual(["founder_50", "theme_submitter"]);
  });
});
