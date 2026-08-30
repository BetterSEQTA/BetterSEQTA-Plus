/** @jest-environment jsdom */

import {
  applyModStyleProperty,
  restoreModStyleProperty,
  stripStyleImportantSuffix,
} from "./modStyle";

describe("modStyle", () => {
  it("strips trailing !important from values", () => {
    expect(stripStyleImportantSuffix("100% !important")).toBe("100%");
    expect(stripStyleImportantSuffix("100% !IMPORTANT")).toBe("100%");
  });

  it("applies styles with important priority by default", () => {
    const element = document.createElement("div");
    const snapshot = applyModStyleProperty(element, "max-width", "100%");
    expect(element.style.getPropertyValue("max-width")).toBe("100%");
    expect(element.style.getPropertyPriority("max-width")).toBe("important");
    restoreModStyleProperty(element, "max-width", snapshot);
    expect(element.style.getPropertyValue("max-width")).toBe("");
  });
});
