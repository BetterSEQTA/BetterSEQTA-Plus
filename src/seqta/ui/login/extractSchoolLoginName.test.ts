/**
 * @jest-environment jsdom
 */
import {
  extractSchoolLoginName,
  parseSchoolNameFromTitle,
} from "./extractSchoolLoginName";

describe("parseSchoolNameFromTitle", () => {
  it("removes SEQTA product labels", () => {
    expect(parseSchoolNameFromTitle("Example High School ― SEQTA Learn")).toBe(
      "Example High School",
    );
    expect(parseSchoolNameFromTitle("SEQTA Engage")).toBeNull();
  });
});

describe("extractSchoolLoginName", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "SEQTA Learn";
  });

  it("prefers the native login heading", () => {
    document.body.innerHTML = `
      <div class="login">
        <h1>Example High School</h1>
      </div>
    `;

    expect(extractSchoolLoginName()).toBe("Example High School");
  });

  it("ignores username/password labels", () => {
    document.body.innerHTML = `
      <div class="login">
        <h2>Password</h2>
      </div>
    `;
    document.title = "Example High School ― SEQTA Learn";

    expect(extractSchoolLoginName()).toBe("Example High School");
  });
});
