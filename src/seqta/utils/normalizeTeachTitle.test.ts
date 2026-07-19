import { normalizeTeachDocumentTitle } from "./normalizeTeachTitle";

describe("normalizeTeachDocumentTitle", () => {
  it("appends Teach when title ends with SEQTA", () => {
    expect(normalizeTeachDocumentTitle("My day - Timetable - SEQTA")).toBe(
      "My day - Timetable ― SEQTA Teach",
    );
    expect(normalizeTeachDocumentTitle("Direqt messages - SEQTA")).toBe(
      "Direqt messages ― SEQTA Teach",
    );
    expect(normalizeTeachDocumentTitle("Help! - SEQTA")).toBe(
      "Help! ― SEQTA Teach",
    );
  });

  it("rewrites BetterSEQTA+ titles", () => {
    expect(normalizeTeachDocumentTitle("Home ― BetterSEQTA+")).toBe(
      "Home ― SEQTA Teach",
    );
  });

  it("leaves Teach / Learn / Engage titles alone", () => {
    expect(normalizeTeachDocumentTitle("Home ― SEQTA Teach")).toBe(
      "Home ― SEQTA Teach",
    );
    expect(normalizeTeachDocumentTitle("Home ― SEQTA Learn")).toBe(
      "Home ― SEQTA Learn",
    );
    expect(normalizeTeachDocumentTitle("Home ― SEQTA Engage")).toBe(
      "Home ― SEQTA Engage",
    );
  });
});
