import loginPortalCSS from "@/css/injected/login-portal.scss?inline";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import {
  submitSeqtaGoogleLogin,
  submitSeqtaLogin,
  submitSeqtaRecover,
} from "@/seqta/utils/seqtaLoginApi";
import {
  fetchLoginShellConfig,
  type SeqtaLoginShellConfig,
} from "@/seqta/utils/seqtaLoginShellConfig";
import { createSamlLoginForm } from "./createSamlLoginForm";
import { resolveSchoolLoginBackground } from "./extractSchoolLoginBackground";
import { resolveSchoolLoginName } from "./extractSchoolLoginName";
import { mountNativeGoogleSignIn } from "./mountNativeGoogleSignIn";
import {
  applyPasswordResetUi,
  resolvePasswordResetAvailability,
  watchPasswordResetAvailability,
  type PasswordResetAvailability,
} from "./resolvePasswordResetAvailability";
import {
  clearEphemeralSession,
  markEphemeralSession,
  markSkipEphemeralLogoutOnNextLoad,
} from "./seqtaSessionPersistence";
import { isCustomLoginPortalEnabled } from "./isCustomLoginPortalEnabled";
import {
  unwatchLoginPortalTheme,
  watchLoginPortalTheme,
} from "./syncLoginPortalTheme";

const PORTAL_ID = "bsplus-login-portal";
type LoginView = "login" | "reset" | "reset-sent";

let mountPromise: Promise<void> | null = null;
let teardownGoogleSignIn: (() => void) | null = null;
let unwatchPasswordReset: (() => void) | null = null;
let settingsHooked = false;

function hookLoginPortalSettings() {
  if (settingsHooked) return;
  settingsHooked = true;

  const sync = () => {
    const onLoginPage =
      !!document.querySelector(".login") || !!document.getElementById(PORTAL_ID);
    if (!onLoginPage) return;

    if (isCustomLoginPortalEnabled()) {
      mountPromise = null;
      void mountCustomLogin();
      return;
    }
    unmountCustomLogin();
  };

  settingsState.register("customLoginPortal", sync);
  settingsState.register("onoff", sync);
}

function createInput(
  placeholder: string,
  type: "text" | "password" | "email",
  autocomplete: string,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  input.autocomplete = autocomplete;
  input.className = "input";
  input.required = true;
  return input;
}

function createInputShell(extraClass = ""): HTMLDivElement {
  const shell = document.createElement("div");
  shell.className = `input-shell${extraClass ? ` ${extraClass}` : ""}`;
  return shell;
}

function createPasswordField(): {
  shell: HTMLDivElement;
  input: HTMLInputElement;
  toggle: HTMLButtonElement;
} {
  const shell = createInputShell("input-shell--password");
  const input = createInput("Password", "password", "current-password");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "toggle";
  toggle.setAttribute("aria-label", "Show password");
  toggle.innerHTML = `
    <svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
    </svg>
    <svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6a9.77 9.77 0 0 1 8.82 5.5 9.647 9.647 0 0 1-2.41 3.12l1.41 1.41-1.41 1.41-1.41-1.41A9.86 9.86 0 0 1 12 18c-5 0-9.27-3.11-11-7a10.15 10.15 0 0 1 2.18-3.32L1.71 6.29 3.12 4.88 4.53 6.29A9.77 9.77 0 0 1 12 6zm0 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z"/>
    </svg>
  `;

  toggle.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    toggle.classList.toggle("is-visible", !showing);
  });

  shell.append(input, toggle);
  return { shell, input, toggle };
}

function appendBackgroundMedia(
  mediaWrap: HTMLElement,
  media: { src: string; type: "image" | "video" },
) {
  if (media.type === "video") {
    const video = document.createElement("video");
    video.className = "background";
    video.src = media.src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    mediaWrap.appendChild(video);
    return;
  }

  const img = document.createElement("img");
  img.className = "background";
  img.src = media.src;
  img.alt = "";
  img.decoding = "async";
  mediaWrap.appendChild(img);
}

function mountShadowPortal(): {
  host: HTMLDivElement;
  heading: HTMLHeadingElement;
  subtitle: HTMLParagraphElement;
  logo: HTMLImageElement;
  card: HTMLDivElement;
  loginPanel: HTMLDivElement;
  resetPanel: HTMLDivElement;
  resetSentPanel: HTMLDivElement;
  usernameInput: HTMLInputElement;
  passwordField: ReturnType<typeof createPasswordField>;
  resetEmailInput: HTMLInputElement;
  rememberInput: HTMLInputElement;
  errorEl: HTMLParagraphElement;
  resetErrorEl: HTMLParagraphElement;
  submitButton: HTMLButtonElement;
  resetSubmitButton: HTMLButtonElement;
  forgotWrap: HTMLDivElement;
  backToLoginButton: HTMLButtonElement;
  resetBackButton: HTMLButtonElement;
  alternatives: HTMLDivElement;
  googleWrap: HTMLDivElement;
  samlWrap: HTMLDivElement;
} {
  const host = document.createElement("div");
  host.id = PORTAL_ID;
  host.setAttribute("excludeDarkCheck", "true");

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = loginPortalCSS;
  shadow.appendChild(style);

  const portal = document.createElement("div");
  portal.className = "portal";
  shadow.appendChild(portal);

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  portal.appendChild(backdrop);

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "media";
  backdrop.appendChild(mediaWrap);

  const card = document.createElement("div");
  card.className = "card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Sign in to SEQTA");
  portal.appendChild(card);

  const logo = document.createElement("img");
  logo.className = "logo";
  logo.alt = "";
  logo.hidden = true;
  card.appendChild(logo);

  const heading = document.createElement("h1");
  heading.className = "school";
  heading.textContent = "Sign in";
  card.appendChild(heading);

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = "Enter your SEQTA credentials to continue";
  card.appendChild(subtitle);

  const loginPanel = document.createElement("div");
  loginPanel.className = "panel panel--login";
  card.appendChild(loginPanel);

  const form = document.createElement("form");
  form.className = "form";
  form.noValidate = true;
  loginPanel.appendChild(form);

  const usernameField = document.createElement("div");
  usernameField.className = "field";
  const usernameShell = createInputShell();
  const usernameInput = createInput("Username", "text", "username");
  usernameShell.appendChild(usernameInput);
  usernameField.appendChild(usernameShell);

  const passwordField = createPasswordField();
  const passwordWrap = document.createElement("div");
  passwordWrap.className = "field";
  passwordWrap.appendChild(passwordField.shell);

  const rememberLabel = document.createElement("label");
  rememberLabel.className = "remember";
  const rememberInput = document.createElement("input");
  rememberInput.type = "checkbox";
  rememberInput.checked = true;
  rememberInput.className = "remember-input";
  const rememberText = document.createElement("span");
  rememberText.textContent = "Keep me logged in";
  rememberLabel.append(rememberInput, rememberText);

  const errorEl = document.createElement("p");
  errorEl.className = "error";
  errorEl.hidden = true;

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "submit";
  submitButton.textContent = "Login";

  const forgotWrap = document.createElement("div");
  forgotWrap.className = "forgot-wrap";

  form.append(
    usernameField,
    passwordWrap,
    rememberLabel,
    errorEl,
    submitButton,
    forgotWrap,
  );

  const alternatives = document.createElement("div");
  alternatives.className = "alternatives";
  alternatives.hidden = true;
  loginPanel.appendChild(alternatives);

  const divider = document.createElement("p");
  divider.className = "divider";
  divider.textContent = "or";
  divider.hidden = true;
  alternatives.appendChild(divider);

  const googleWrap = document.createElement("div");
  googleWrap.className = "google-wrap";
  alternatives.appendChild(googleWrap);

  const samlWrap = document.createElement("div");
  samlWrap.className = "saml-wrap";
  alternatives.appendChild(samlWrap);

  const resetPanel = document.createElement("div");
  resetPanel.className = "panel panel--reset";
  resetPanel.hidden = true;
  card.appendChild(resetPanel);

  const resetIntro = document.createElement("p");
  resetIntro.className = "reset-copy";
  resetIntro.textContent =
    "Enter the email address linked to your SEQTA account and we will send reset instructions.";
  resetPanel.appendChild(resetIntro);

  const resetForm = document.createElement("form");
  resetForm.className = "form";
  resetForm.noValidate = true;
  resetPanel.appendChild(resetForm);

  const resetField = document.createElement("div");
  resetField.className = "field";
  const resetShell = createInputShell();
  const resetEmailInput = createInput("Email address", "email", "email");
  resetShell.appendChild(resetEmailInput);
  resetField.appendChild(resetShell);

  const resetErrorEl = document.createElement("p");
  resetErrorEl.className = "error";
  resetErrorEl.hidden = true;

  const resetSubmitButton = document.createElement("button");
  resetSubmitButton.type = "submit";
  resetSubmitButton.className = "submit";
  resetSubmitButton.textContent = "Send reset email";

  const resetBackButton = document.createElement("button");
  resetBackButton.type = "button";
  resetBackButton.className = "text-link";
  resetBackButton.textContent = "Back to login";

  resetForm.append(resetField, resetErrorEl, resetSubmitButton, resetBackButton);

  const resetSentPanel = document.createElement("div");
  resetSentPanel.className = "panel panel--reset-sent";
  resetSentPanel.hidden = true;
  card.appendChild(resetSentPanel);

  const resetSentTitle = document.createElement("h2");
  resetSentTitle.className = "reset-title";
  resetSentTitle.textContent = "Check your email";
  resetSentPanel.appendChild(resetSentTitle);

  const resetSentCopy = document.createElement("p");
  resetSentCopy.className = "reset-copy";
  resetSentCopy.textContent =
    "If an account exists for that address, you will receive an email with instructions to reset your password.";
  resetSentPanel.appendChild(resetSentCopy);

  const resetSentNote = document.createElement("p");
  resetSentNote.className = "reset-note";
  resetSentNote.textContent =
    "Did not receive anything? Check your spam folder or contact your school.";
  resetSentPanel.appendChild(resetSentNote);

  const backToLoginButton = document.createElement("button");
  backToLoginButton.type = "button";
  backToLoginButton.className = "submit submit--secondary";
  backToLoginButton.textContent = "Back to login";
  resetSentPanel.appendChild(backToLoginButton);

  document.body.appendChild(host);
  watchLoginPortalTheme(host);

  return {
    host,
    heading,
    subtitle,
    logo,
    card,
    loginPanel,
    resetPanel,
    resetSentPanel,
    usernameInput,
    passwordField,
    resetEmailInput,
    rememberInput,
    errorEl,
    resetErrorEl,
    submitButton,
    resetSubmitButton,
    forgotWrap,
    backToLoginButton,
    resetBackButton,
    alternatives,
    googleWrap,
    samlWrap,
  };
}

function applyShellConfig(
  ui: ReturnType<typeof mountShadowPortal>,
  config: SeqtaLoginShellConfig,
) {
  if (config.schoolName) {
    ui.heading.textContent = config.schoolName;
    ui.card.setAttribute("aria-label", `Sign in to ${config.schoolName}`);
  }

  if (config.message) {
    ui.subtitle.textContent = config.message;
  }

  if (config.logoUrl) {
    ui.logo.src = config.logoUrl;
    ui.logo.hidden = false;
  }

  const hasGoogle = !!config.google?.client_id;
  const hasSaml = config.saml.length > 0;
  ui.alternatives.hidden = !hasGoogle && !hasSaml;
  const divider = ui.alternatives.querySelector(".divider") as HTMLElement;
  if (divider) divider.hidden = !(hasGoogle && hasSaml);

  ui.samlWrap.replaceChildren();
  for (const samlConfig of config.saml) {
    if (samlConfig.autologin) {
      const form = createSamlLoginForm(samlConfig);
      ui.host.shadowRoot!.querySelector(".portal")!.appendChild(form);
      form.requestSubmit();
      return;
    }
    ui.samlWrap.appendChild(createSamlLoginForm(samlConfig));
  }
}

async function mountPortal(): Promise<void> {
  if (document.getElementById(PORTAL_ID)) return;

  document.documentElement.classList.add("bsplus-login-active");
  document.body.classList.add("bsplus-login-active");

  const ui = mountShadowPortal();
  const mediaWrap = ui.host.shadowRoot!.querySelector(".media") as HTMLElement;

  let submitting = false;
  let shellConfig: SeqtaLoginShellConfig | null = null;

  const setView = (next: LoginView) => {
    ui.loginPanel.hidden = next !== "login";
    ui.resetPanel.hidden = next !== "reset";
    ui.resetSentPanel.hidden = next !== "reset-sent";
    ui.subtitle.hidden = next !== "login";

    if (next === "login") {
      ui.usernameInput.focus();
    } else if (next === "reset") {
      ui.resetEmailInput.focus();
    }
  };

  const setError = (message: string | null) => {
    if (!message) {
      ui.errorEl.hidden = true;
      ui.errorEl.textContent = "";
      return;
    }
    ui.errorEl.hidden = false;
    ui.errorEl.textContent = message;
  };

  const setResetError = (message: string | null) => {
    if (!message) {
      ui.resetErrorEl.hidden = true;
      ui.resetErrorEl.textContent = "";
      return;
    }
    ui.resetErrorEl.hidden = false;
    ui.resetErrorEl.textContent = message;
  };

  const setLoading = (loading: boolean) => {
    submitting = loading;
    ui.submitButton.disabled = loading;
    ui.usernameInput.disabled = loading;
    ui.passwordField.input.disabled = loading;
    ui.rememberInput.disabled = loading;
    ui.passwordField.toggle.disabled = loading;
    ui.submitButton.textContent = loading ? "Signing in…" : "Login";
  };

  const setResetLoading = (loading: boolean) => {
    submitting = loading;
    ui.resetSubmitButton.disabled = loading;
    ui.resetEmailInput.disabled = loading;
    ui.resetBackButton.disabled = loading;
    ui.resetSubmitButton.textContent = loading
      ? "Sending…"
      : "Send reset email";
  };

  const persistSessionChoice = (remember: boolean) => {
    if (remember) {
      clearEphemeralSession();
    } else {
      markEphemeralSession();
      markSkipEphemeralLogoutOnNextLoad();
    }
  };

  const completeLogin = (remember: boolean) => {
    persistSessionChoice(remember);
    location.reload();
  };

  void resolveSchoolLoginName().then((schoolName) => {
    if (!schoolName || shellConfig?.schoolName) return;
    ui.heading.textContent = schoolName;
    ui.card.setAttribute("aria-label", `Sign in to ${schoolName}`);
  });

  const [media, config, passwordReset] = await Promise.all([
    resolveSchoolLoginBackground(),
    fetchLoginShellConfig(),
    resolvePasswordResetAvailability(),
  ]);

  shellConfig = config;
  if (config) {
    applyShellConfig(ui, config);
  }

  const showInternalReset = () => {
    setError(null);
    setResetError(null);
    setView("reset");
  };

  const refreshPasswordResetUi = (reset: PasswordResetAvailability) => {
    applyPasswordResetUi(
      { forgotWrap: ui.forgotWrap, onInternalReset: showInternalReset },
      reset,
    );
  };

  refreshPasswordResetUi(passwordReset);
  unwatchPasswordReset = watchPasswordResetAvailability(refreshPasswordResetUi, {
    api: config,
  });

  if (media) {
    appendBackgroundMedia(mediaWrap, media);
  } else if (config?.backgroundUrl) {
    appendBackgroundMedia(mediaWrap, {
      src: config.backgroundUrl,
      type: "image",
    });
  }

  if (config?.google?.client_id) {
    teardownGoogleSignIn = await mountNativeGoogleSignIn({
      container: ui.googleWrap,
      onCredential: async (credential) => {
        if (submitting) return;
        setError(null);
        setLoading(true);
        try {
          const result = await submitSeqtaGoogleLogin(credential);
          if (result.success) {
            completeLogin(ui.rememberInput.checked);
            return;
          }
          setError(result.error);
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Google sign-in failed",
          );
        } finally {
          setLoading(false);
        }
      },
    });
  }

  ui.resetBackButton.addEventListener("click", () => setView("login"));
  ui.backToLoginButton.addEventListener("click", () => setView("login"));

  const loginForm = ui.host.shadowRoot!.querySelector(
    ".panel--login form",
  )!;
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    const username = ui.usernameInput.value.trim();
    const password = ui.passwordField.input.value;
    if (!username || !password) {
      setError("Please enter your username and password");
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const result = await submitSeqtaLogin({ username, password });
        if (result.success) {
          completeLogin(ui.rememberInput.checked);
          return;
        }
        setError(result.error);
        ui.passwordField.input.value = "";
        ui.passwordField.input.focus();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Login failed. Try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  });

  const resetForm = ui.host.shadowRoot!.querySelector(
    ".panel--reset form",
  )!;
  resetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting) return;

    setResetError(null);
    const email = ui.resetEmailInput.value.trim();
    if (!email) {
      setResetError("Please enter your email address");
      return;
    }

    void (async () => {
      setResetLoading(true);
      try {
        const result = await submitSeqtaRecover(email);
        if (result.success) {
          setView("reset-sent");
          return;
        }
        setResetError(result.error);
      } catch (error) {
        setResetError(
          error instanceof Error
            ? error.message
            : "Could not send reset email. Try again.",
        );
      } finally {
        setResetLoading(false);
      }
    })();
  });

  ui.usernameInput.focus();
}

/** Replace the native SEQTA login shell with a full-screen background + portal card. */
export function mountCustomLogin(): Promise<void> {
  hookLoginPortalSettings();

  if (!isCustomLoginPortalEnabled()) {
    unmountCustomLogin();
    return Promise.resolve();
  }

  if (document.getElementById(PORTAL_ID)) return Promise.resolve();

  if (!mountPromise) {
    mountPromise = mountPortal().catch((error) => {
      mountPromise = null;
      console.error("[BetterSEQTA+] Failed to mount custom login:", error);
    });
  }

  return mountPromise;
}

export function unmountCustomLogin() {
  teardownGoogleSignIn?.();
  teardownGoogleSignIn = null;
  unwatchPasswordReset?.();
  unwatchPasswordReset = null;
  unwatchLoginPortalTheme();
  document.getElementById(PORTAL_ID)?.remove();
  document.documentElement.classList.remove("bsplus-login-active");
  document.body.classList.remove("bsplus-login-active");
  mountPromise = null;
}
