/**
 * @jest-environment jsdom
 */
import { createSamlLoginForm } from "./createSamlLoginForm";

describe("createSamlLoginForm", () => {
  it("creates a POST form with hidden SAML fields", () => {
    const form = createSamlLoginForm(
      {
        method: "POST",
        url: "https://idp.example/saml",
        request: "encoded-request",
        sigalg: "sig",
        signature: "signature",
        relaystate: "relay%20state",
        label: "School SSO",
      },
      "Fallback label",
    );

    expect(form.method.toLowerCase()).toBe("post");
    expect(form.action).toBe("https://idp.example/saml");
    expect(
      form.querySelector('input[name="SAMLRequest"]')?.getAttribute("value"),
    ).toBe("encoded-request");
    expect(
      form.querySelector('input[name="RelayState"]')?.getAttribute("value"),
    ).toBe("relay state");
    expect(form.querySelector("button")?.textContent).toBe("School SSO");
  });
});
