/**
 * @jest-environment jsdom
 */
import {
  extractPasswordResetFromLoginDom,
  mergePasswordResetAvailability,
} from "./resolvePasswordResetAvailability";

describe("extractPasswordResetFromLoginDom", () => {
  it("detects a visible internal forgot-password control", () => {
    document.body.innerHTML = `
      <div class="login">
        <div class="reset" style="display: block;">
          <button type="button" class="uiButton forgot">Forgot your password?</button>
        </div>
      </div>
    `;

    expect(extractPasswordResetFromLoginDom()).toEqual({
      available: true,
      resetLink: null,
      resetPresent: true,
    });
  });

  it("detects reset even when the native login shell is visibility-hidden", () => {
    document.body.innerHTML = `
      <div class="login" style="visibility: hidden;">
        <div class="reset" style="display: block;">
          <button type="button" class="uiButton forgot">Forgot your password?</button>
        </div>
      </div>
    `;

    expect(extractPasswordResetFromLoginDom().available).toBe(true);
  });

  it("detects an external reset link", () => {
    document.body.innerHTML = `
      <div class="login">
        <div class="reset" style="display: block;">
          <a href="https://school.example/reset">Forgot your password?</a>
        </div>
      </div>
    `;

    expect(extractPasswordResetFromLoginDom()).toEqual({
      available: true,
      resetLink: "https://school.example/reset",
      resetPresent: true,
    });
  });

  it("returns unavailable when native reset UI uses display:none", () => {
    document.body.innerHTML = `
      <div class="login">
        <div class="reset" style="display: none;">
          <button type="button" class="uiButton forgot">Forgot your password?</button>
        </div>
      </div>
    `;

    expect(extractPasswordResetFromLoginDom()).toEqual({
      available: false,
      resetLink: null,
      resetPresent: true,
    });
  });
});

describe("mergePasswordResetAvailability", () => {
  it("hides reset when the login probe disables it", () => {
    expect(
      mergePasswordResetAvailability(
        {
          schoolName: null,
          message: null,
          logoUrl: null,
          backgroundUrl: null,
          google: null,
          passwordResetEnabled: false,
          resetLink: null,
          saml: [],
          basic: true,
          type: "student",
        },
        { available: true, resetLink: null, resetPresent: true },
      ),
    ).toEqual({ available: false, resetLink: null });
  });

  it("shows reset from the login probe even if native reset is hidden", () => {
    expect(
      mergePasswordResetAvailability(
        {
          schoolName: null,
          message: null,
          logoUrl: null,
          backgroundUrl: null,
          google: null,
          passwordResetEnabled: true,
          resetLink: null,
          saml: [],
          basic: true,
          type: "student",
        },
        { available: false, resetLink: null, resetPresent: true },
      ),
    ).toEqual({ available: true, resetLink: null });
  });

  it("uses the API reset link when enabled", () => {
    expect(
      mergePasswordResetAvailability(
        {
          schoolName: null,
          message: null,
          logoUrl: null,
          backgroundUrl: null,
          google: null,
          passwordResetEnabled: true,
          resetLink: "https://school.example/reset",
          saml: [],
          basic: true,
          type: "student",
        },
        { available: false, resetLink: null, resetPresent: true },
      ),
    ).toEqual({
      available: true,
      resetLink: "https://school.example/reset",
    });
  });

  it("falls back to native DOM when the probe is unavailable", () => {
    expect(
      mergePasswordResetAvailability(null, {
        available: true,
        resetLink: null,
        resetPresent: true,
      }),
    ).toEqual({ available: true, resetLink: null });
  });
});
