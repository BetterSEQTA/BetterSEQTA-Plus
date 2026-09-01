/**
 * @jest-environment jsdom
 */
import {
  mountNativeGoogleSignIn,
  waitForNativeGoogleButton,
} from "./mountNativeGoogleSignIn";

describe("waitForNativeGoogleButton", () => {
  it("finds an already-rendered native Google button", async () => {
    document.body.innerHTML = `
      <div class="login">
        <div class="googleLogin">
          <div class="g_id_signin">
            <div role="button" tabindex="0">Google</div>
          </div>
        </div>
      </div>
    `;

    const button = await waitForNativeGoogleButton(document, 500);
    expect(button?.textContent).toBe("Google");
  });

  it("waits for SEQTA to inject the native Google button", async () => {
    document.body.innerHTML = `<div class="login"><div class="alternatives"></div></div>`;
    const login = document.querySelector(".login")!;

    const promise = waitForNativeGoogleButton(document, 2000);

    window.setTimeout(() => {
      const googleLogin = document.createElement("div");
      googleLogin.className = "googleLogin";
      googleLogin.innerHTML =
        '<div class="g_id_signin"><div role="button">Google</div></div>';
      login.querySelector(".alternatives")!.appendChild(googleLogin);
    }, 30);

    const button = await promise;
    expect(button).not.toBeNull();
  });
});

describe("mountNativeGoogleSignIn", () => {
  it("clicks the native button and forwards the Google credential", async () => {
    document.body.innerHTML = `
      <div class="login">
        <div class="googleLogin">
          <div class="g_id_signin">
            <button type="button" role="button">Native Google</button>
          </div>
        </div>
      </div>
    `;

    const nativeButton = document.querySelector<HTMLButtonElement>(
      '.login [role="button"]',
    )!;
    nativeButton.addEventListener("click", () => {
      window._googleAuthSuccess?.({ credential: "native-google-jwt" });
    });

    const container = document.createElement("div");
    const onCredential = jest.fn();

    const teardown = await mountNativeGoogleSignIn({ container, onCredential });
    const portalButton = container.querySelector<HTMLButtonElement>(".google-button")!;

    expect(portalButton.disabled).toBe(false);
    expect(portalButton.querySelector(".google-button__label")?.textContent).toBe(
      "Sign in with Google",
    );
    portalButton.click();

    expect(onCredential).toHaveBeenCalledWith("native-google-jwt");
    teardown();
  });
});
