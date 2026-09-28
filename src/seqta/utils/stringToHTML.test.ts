/**
 * @jest-environment jsdom
 */

import stringToHTML from "./stringToHTML";

describe("stringToHTML", () => {
  it("preserves inline onclick handlers used by lesson action buttons", () => {
    const body = stringToHTML(
      `<div class="day-button clickable" onclick="location.href='../#?page=/courses/123:456'">Go</div>`,
    );

    const el = body.firstElementChild as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.getAttribute("onclick")).toContain("location.href");
  });
});
