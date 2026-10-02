import {
  isPasswordResetAvailable,
  parseLoginShellConfig,
  seqtaBrandingUrl,
} from "./seqtaLoginShellConfig";

describe("seqtaBrandingUrl", () => {
  it("builds role-scoped branding URLs", () => {
    expect(
      seqtaBrandingUrl("abc-123", "student", "https://learn.example.edu.au"),
    ).toBe(
      "https://learn.example.edu.au/seqta/student/branding?file=abc-123",
    );
  });
});

describe("isPasswordResetAvailable", () => {
  it("allows external reset links", () => {
    expect(
      isPasswordResetAvailable({
        resetLink: "https://school.example/reset",
        passwordResetEnabled: false,
        basic: false,
        type: "student",
      }),
    ).toBe(true);
  });

  it("matches SEQTA basic reset rules", () => {
    expect(
      isPasswordResetAvailable({
        resetLink: null,
        passwordResetEnabled: true,
        basic: true,
        type: "student",
      }),
    ).toBe(true);

    expect(
      isPasswordResetAvailable({
        resetLink: null,
        passwordResetEnabled: false,
        basic: true,
        type: "student",
      }),
    ).toBe(false);

    expect(
      isPasswordResetAvailable({
        resetLink: null,
        passwordResetEnabled: true,
        basic: true,
        type: "tutor",
      }),
    ).toBe(false);
  });
});

describe("parseLoginShellConfig", () => {
  it("parses login probe payload from session recording", () => {
    const config = parseLoginShellConfig(
      {
        "site.name": "SEQTA College",
        message: "Welcome to SEQTA",
        reset: true,
        basic: true,
        type: "student",
        logo: "4dc5ed7a-5dc8-48d9-a3b3-fef0d89f5251",
        files: ["90c0c265-f123-4521-a922-ce6143ef4b92"],
        google: {
          client_id:
            "808656306728-6hf4hduqba7rhb048p4537j68m2s84b7.apps.googleusercontent.com",
          scope: "https://www.googleapis.com/auth/userinfo.email",
          cookiepolicy: "single_host_origin",
        },
        saml: [],
      },
      { role: "student", origin: "https://learn.example.edu.au" },
    );

    expect(config.schoolName).toBe("SEQTA College");
    expect(config.message).toBe("Welcome to SEQTA");
    expect(config.logoUrl).toBe(
      "https://learn.example.edu.au/seqta/student/branding?file=4dc5ed7a-5dc8-48d9-a3b3-fef0d89f5251",
    );
    expect(config.backgroundUrl).toBe(
      "https://learn.example.edu.au/seqta/student/branding?file=90c0c265-f123-4521-a922-ce6143ef4b92",
    );
    expect(config.google?.client_id).toContain(".apps.googleusercontent.com");
    expect(isPasswordResetAvailable(config)).toBe(true);
  });

  it("parses SAML providers", () => {
    const config = parseLoginShellConfig(
      {
        saml: [
          {
            method: "POST",
            url: "https://idp.example/saml",
            request: "encoded-request",
            sigalg: "sig",
            signature: "signature",
            label: "School SSO",
          },
        ],
      },
      { role: "student", origin: "https://learn.example.edu.au" },
    );

    expect(config.saml).toEqual([
      {
        method: "POST",
        url: "https://idp.example/saml",
        request: "encoded-request",
        sigalg: "sig",
        signature: "signature",
        label: "School SSO",
        autologin: false,
      },
    ]);
  });
});
