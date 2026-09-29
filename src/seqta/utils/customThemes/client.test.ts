import {
  formatCustomThemeStatus,
  statusBadgeClass,
  canEditCustomTheme,
} from "./client";
import {
  formatEnvelopeErrorMessage,
  normalizeCustomThemeApiResponse,
  parseApiError,
  parseValidationErrors,
} from "./parseApiEnvelope";

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
    expect(parseApiError(null, 500)).toBe("Request failed (HTTP 500)");
    expect(
      parseValidationErrors({
        code: "INVALID_THEME_STRUCTURE",
        message: "Bad theme",
        details: { errors: ["Missing CustomCSS", "Missing name"] },
      }),
    ).toEqual(["Missing CustomCSS", "Missing name"]);
    expect(
      formatEnvelopeErrorMessage({
        success: false,
        data: null,
        error: { code: "INVALID_THEME_STRUCTURE", message: "Bad theme" },
        httpStatus: 422,
      }),
    ).toContain("Bad theme");
  });

  it("normalizes Laravel validation bodies", () => {
    const out = normalizeCustomThemeApiResponse(
      {
        message: "The given data was invalid.",
        errors: { theme_zip: ["The theme zip field is required."] },
      },
      422,
    );
    expect(out.success).toBe(false);
    expect((out.error as { message: string }).message).toContain("theme_zip");
  });
});
