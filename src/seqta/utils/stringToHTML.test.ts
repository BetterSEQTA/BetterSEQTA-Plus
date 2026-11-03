/**
 * @jest-environment jsdom
 */

import stringToHTML from "./stringToHTML";

describe("stringToHTML", () => {
  it("strips inline onclick handlers and keeps data-href", () => {
    const body = stringToHTML(
      `<div class="day-button clickable" data-href="../#?page=/courses/123:456" onclick="location.href='x'">Go</div>`,
    );

    const el = body.firstElementChild as HTMLElement | null;
    expect(el).not.toBeNull();
    expect(el?.hasAttribute("onclick")).toBe(false);
    expect(el?.dataset.href).toBe("../#?page=/courses/123:456");
  });

  it("strips javascript: URLs", () => {
    const body = stringToHTML(`<a href="javascript:alert(1)">x</a>`);
    expect(body.querySelector("a")?.getAttribute("href")).toBeNull();
  });
});
