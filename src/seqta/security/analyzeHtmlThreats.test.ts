import { describe, expect, it } from "vitest";

import { analyzeHtmlThreats } from "./analyzeHtmlThreats";

describe("analyzeHtmlThreats", () => {
  it("does not flag benign HTML", () => {
    const r = analyzeHtmlThreats("<p>Hello <strong>world</strong></p>");
    expect(r.blocked).toBe(false);
    expect(r.findings).toHaveLength(0);
  });

  it("flags script tags", () => {
    const r = analyzeHtmlThreats('<p>x</p><script>alert(1)</script>');
    expect(r.blocked).toBe(true);
    expect(r.findings.some((f) => f.kind === "script_tag")).toBe(true);
  });

  it("flags javascript: URLs", () => {
    const r = analyzeHtmlThreats('<a href="javascript:void(0)">click</a>');
    expect(r.blocked).toBe(true);
    expect(r.findings.some((f) => f.kind === "dangerous_url_scheme")).toBe(
      true,
    );
  });

  it("flags inline event handlers", () => {
    const r = analyzeHtmlThreats('<img src="https://example.com/x.png" onerror="alert(1)">');
    expect(r.blocked).toBe(true);
    expect(
      r.findings.some((f) => f.kind === "inline_event_handler"),
    ).toBe(true);
  });

  it("allows data:image/png sources", () => {
    const r = analyzeHtmlThreats(
      '<img alt="i" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==">',
    );
    expect(r.blocked).toBe(false);
  });

  it("flags data:text/html", () => {
    const r = analyzeHtmlThreats(
      '<iframe src="data:text/html,%3Cscript%3E%3C/script%3E"></iframe>',
    );
    expect(r.blocked).toBe(true);
  });
});
