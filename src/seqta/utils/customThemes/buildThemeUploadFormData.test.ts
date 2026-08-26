/** @jest-environment jsdom */
import { mergeUploadPayload } from "./buildThemeUploadFormData";

describe("buildThemeUploadFormData", () => {
  it("mergeUploadPayload attaches trimmed submission notes", () => {
    const merged = mergeUploadPayload(
      { themeZip: { fieldName: "theme_zip", filename: "t.zip", mimeType: "application/zip", dataBase64: "abc" } },
      "  Please review  ",
    );
    expect(merged.submissionNotes).toBe("Please review");
    expect(merged.themeZip?.fieldName).toBe("theme_zip");
  });

  it("mergeUploadPayload omits empty notes", () => {
    const merged = mergeUploadPayload({ looseFiles: [] }, "   ");
    expect(merged.submissionNotes).toBeUndefined();
  });
});
