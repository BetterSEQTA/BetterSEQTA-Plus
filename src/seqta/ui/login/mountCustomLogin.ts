import loginPortalCSS from "@/css/injected/login-portal.scss?inline";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { submitSeqtaLogin } from "@/seqta/utils/seqtaLoginApi";
import { resolveSchoolLoginBackground } from "./extractSchoolLoginBackground";
import { resolveSchoolLoginName } from "./extractSchoolLoginName";
import {
  clearEphemeralSession,
  markEphemeralSession,
  markSkipEphemeralLogoutOnNextLoad,
} from "./seqtaSessionPersistence";
import {
  unwatchLoginPortalTheme,
  watchLoginPortalTheme,
} from "./syncLoginPortalTheme";

const PORTAL_ID = "bsplus-login-portal";

let mountPromise: Promise<void> | null = null;

function createInput(
  placeholder: string,
  type: "text" | "password",
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
  heading: HTMLHeadingElement;
  card: HTMLDivElement;
  usernameInput: HTMLInputElement;
  passwordField: ReturnType<typeof createPasswordField>;
  rememberInput: HTMLInputElement;
  errorEl: HTMLParagraphElement;
  submitButton: HTMLButtonElement;
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

  const heading = document.createElement("h1");
  heading.className = "school";
  heading.textContent = "Sign in";
  card.appendChild(heading);

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent = "Enter your SEQTA credentials to continue";
  card.appendChild(subtitle);

  const form = document.createElement("form");
  form.className = "form";
  form.noValidate = true;
  card.appendChild(form);

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

  form.append(
    usernameField,
    passwordWrap,
    rememberLabel,
    errorEl,
    submitButton,
  );

  document.body.appendChild(host);

  watchLoginPortalTheme(host);

  return {
    heading,
    card,
    usernameInput,
    passwordField,
    rememberInput,
    errorEl,
    submitButton,
  };
}

async function mountPortal(): Promise<void> {
  if (document.getElementById(PORTAL_ID)) return;

  document.documentElement.classList.add("bsplus-login-active");
  document.body.classList.add("bsplus-login-active");

  const {
    heading,
    card,
    usernameInput,
    passwordField,
    rememberInput,
    errorEl,
    submitButton,
  } = mountShadowPortal();

  const host = document.getElementById(PORTAL_ID)!;
  const mediaWrap = host.shadowRoot!.querySelector(".media") as HTMLElement;

  void resolveSchoolLoginName().then((schoolName) => {
    if (!schoolName) return;
    heading.textContent = schoolName;
    card.setAttribute("aria-label", `Sign in to ${schoolName}`);
  });

  const media = await resolveSchoolLoginBackground();
  if (media) {
    appendBackgroundMedia(mediaWrap, media);
  }

  let submitting = false;

  const setError = (message: string | null) => {
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  };

  const setLoading = (loading: boolean) => {
    submitting = loading;
    submitButton.disabled = loading;
    usernameInput.disabled = loading;
    passwordField.input.disabled = loading;
    rememberInput.disabled = loading;
    passwordField.toggle.disabled = loading;
    submitButton.textContent = loading ? "Signing in…" : "Login";
  };

  const form = host.shadowRoot!.querySelector("form")!;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    const username = usernameInput.value.trim();
    const password = passwordField.input.value;
    if (!username || !password) {
      setError("Please enter your username and password");
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const result = await submitSeqtaLogin({ username, password });
        if (result.success) {
          if (rememberInput.checked) {
            clearEphemeralSession();
          } else {
            markEphemeralSession();
            markSkipEphemeralLogoutOnNextLoad();
          }
          location.reload();
          return;
        }
        setError(result.error);
        passwordField.input.value = "";
        passwordField.input.focus();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Login failed. Try again.",
        );
      } finally {
        setLoading(false);
      }
    })();
  });

  usernameInput.focus();
}

/** Replace the native SEQTA login shell with a full-screen background + portal card. */
export function mountCustomLogin(): Promise<void> {
  if (!settingsState.onoff) return Promise.resolve();
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
  unwatchLoginPortalTheme();
  document.getElementById(PORTAL_ID)?.remove();
  document.documentElement.classList.remove("bsplus-login-active");
  document.body.classList.remove("bsplus-login-active");
  mountPromise = null;
}
