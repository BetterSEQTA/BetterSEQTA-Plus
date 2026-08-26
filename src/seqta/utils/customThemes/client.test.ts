import {
  formatCustomThemeStatus,
  statusBadgeClass,
  canEditCustomTheme,
} from "./client";
import { parseApiError, parseValidationErrors } from "./parseApiEnvelope";

describe("customThemes client helpers", () => {
  it("formats status labels", () => {
    expect(formatCustomThemeStatus("pending")).toBe("Pending review");
    expect(formatCustomThemeStatus("approved")).toBe("Approved");
    expect(formatCustomThemeStatus("rejected")).toBe("Rejected");
  });

  it("returns badge classes per status", () => {
    expect(statusBadgeClass("pending")).toContain("amber");
    expect(statusBadgeClass("approved")).toContain("emerald");
    expect(statusBadgeClass("rejected")).toContain("red");
  });

  it("allows edit only for pending and rejected themes", () => {
    expect(canEditCustomTheme({ id: "1", name: "A", description: "", coverImage: "", status: "pending" })).toBe(true);
    expect(canEditCustomTheme({ id: "1", name: "A", description: "", coverImage: "", status: "rejected" })).toBe(true);
    expect(canEditCustomTheme({ id: "1", name: "A", description: "", coverImage: "", status: "approved" })).toBe(false);
  });

  it("parses API envelope errors and validation details", () => {
    expect(parseApiError({ code: "INVALID_THEME_STRUCTURE", message: "Bad theme" })).toBe("Bad theme");
    expect(
      parseValidationErrors({
        code: "INVALID_THEME_STRUCTURE",
        message: "Bad theme",
        details: { errors: ["Missing CustomCSS", "Missing name"] },
      }),
    ).toEqual(["Missing CustomCSS", "Missing name"]);
  });
});
