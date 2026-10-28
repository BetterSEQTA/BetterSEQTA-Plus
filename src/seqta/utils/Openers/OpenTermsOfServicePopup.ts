import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { getApiBase } from "../DevApiBase";
import { closePopup, openPopup } from "./PopupManager";
import fallbackTerms from "@/exampleprivacyresponse.json";
import type { SettingsState } from "@/types/storage";

export const PRIVACY_POLICY_URL = "https://betterseqta.org/privacy";

const PRIVACY_FETCH_TIMEOUT_MS = 8_000;
const POPUP_STYLE_ID = "bsplus-tos-popup-styles";

export interface PrivacyTermsPayload {
  last_updated: string;
  whatsnew_html: string;
}

function isPrivacyTermsPayload(data: unknown): data is PrivacyTermsPayload {
  return (
    !!data &&
    typeof data === "object" &&
    typeof (data as PrivacyTermsPayload).last_updated === "string" &&
    typeof (data as PrivacyTermsPayload).whatsnew_html === "string" &&
    !!(data as PrivacyTermsPayload).whatsnew_html.trim()
  );
}

export function getFallbackPrivacyTerms(): PrivacyTermsPayload {
  return fallbackTerms as PrivacyTermsPayload;
}

export async function fetchPrivacyTerms(): Promise<PrivacyTermsPayload> {
  try {
    const res = await fetch(`${getApiBase()}/api/privacy`, {
      cache: "no-store",
      signal: AbortSignal.timeout(PRIVACY_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return getFallbackPrivacyTerms();
    const data: unknown = await res.json();
    if (!isPrivacyTermsPayload(data)) return getFallbackPrivacyTerms();
    return data;
  } catch (err) {
    console.warn("[TermsOfService] Failed to fetch privacy terms:", err);
    return getFallbackPrivacyTerms();
  }
}

function termsVersionIsNewer(
  remoteLastUpdated: string,
  acceptedLastUpdated?: string,
): boolean {
  if (!acceptedLastUpdated) return true;
  const remote = Date.parse(remoteLastUpdated);
  const accepted = Date.parse(acceptedLastUpdated);
  if (Number.isNaN(remote) || Number.isNaN(accepted)) {
    return remoteLastUpdated !== acceptedLastUpdated;
  }
  return remote > accepted;
}

function resolvedTermsAcceptance(
  state: Pick<
    SettingsState,
    | "termsOfServiceLastAccepted"
    | "privacyStatementShown"
    | "privacyStatementLastUpdated"
  >,
): string | undefined {
  if (state.termsOfServiceLastAccepted) return state.termsOfServiceLastAccepted;
  if (state.privacyStatementShown && state.privacyStatementLastUpdated) {
    return state.privacyStatementLastUpdated;
  }
  return undefined;
}

export function shouldShowTermsOfServicePopup(
  state: Pick<
    SettingsState,
    | "termsOfServiceLastAccepted"
    | "privacyStatementShown"
    | "privacyStatementLastUpdated"
  >,
  terms: PrivacyTermsPayload,
): boolean {
  return termsVersionIsNewer(terms.last_updated, resolvedTermsAcceptance(state));
}

export function markTermsOfServiceAccepted(
  state: Pick<
    SettingsState,
    "termsOfServiceLastAccepted" | "privacyStatementShown" | "privacyStatementLastUpdated"
  >,
  lastUpdated: string,
): void {
  state.termsOfServiceLastAccepted = lastUpdated;
  state.privacyStatementShown = true;
  state.privacyStatementLastUpdated = lastUpdated;
}

function ensurePopupStyles() {
  if (document.getElementById(POPUP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = POPUP_STYLE_ID;
  style.textContent = `
    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.75rem !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      width: 92% !important;
      margin: 0 auto 1rem !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-intro {
      margin: 0 !important;
      font-size: 1rem !important;
      line-height: 1.5 !important;
      flex-shrink: 0 !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-scroll {
      flex: 1 1 auto !important;
      min-height: 8rem !important;
      max-height: min(42vh, 28rem) !important;
      overflow: auto !important;
      border: 1px solid rgba(17, 24, 39, 0.12) !important;
      border-radius: 0.75rem !important;
      padding: 0.85rem 1rem !important;
      background: rgba(17, 24, 39, 0.03) !important;
      font-size: 0.95rem !important;
      line-height: 1.55 !important;
    }

    #whatsnewbk.bsplus-tos-overlay.bsplus-tos-overlay--dark .bsplus-tos-scroll {
      border-color: rgba(255, 255, 255, 0.12) !important;
      background: rgba(255, 255, 255, 0.04) !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-actions {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.65rem !important;
      flex-shrink: 0 !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-btn {
      width: 100% !important;
      min-height: 2.75rem !important;
      padding: 0.75rem 1rem !important;
      border: none !important;
      border-radius: 0.75rem !important;
      font-size: 0.95rem !important;
      font-weight: 600 !important;
      font-family: inherit !important;
      cursor: pointer !important;
      transition: all 0.2s ease-in-out !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-btn--primary {
      background: #2563eb !important;
      color: #ffffff !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-btn--secondary {
      background: rgba(17, 24, 39, 0.08) !important;
      color: inherit !important;
    }

    #whatsnewbk.bsplus-tos-overlay.bsplus-tos-overlay--dark .bsplus-tos-btn--secondary {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-btn:hover:not(:disabled) {
      transform: scale(1.02) !important;
    }

    #whatsnewbk.bsplus-tos-overlay .bsplus-tos-btn:active:not(:disabled) {
      transform: scale(0.98) !important;
    }
  `;
  document.head.appendChild(style);
}

function buildTermsScrollContent(html: string): HTMLElement {
  const parsed = stringToHTML(html);
  const root = parsed.firstElementChild as HTMLElement | null;
  const scroll = document.createElement("div");
  scroll.className = "bsplus-tos-scroll privacyStatement";
  scroll.setAttribute("tabindex", "0");
  scroll.setAttribute("aria-label", "Terms of service and privacy policy");

  if (root?.classList.contains("whatsnewTextContainer")) {
    scroll.innerHTML = root.innerHTML;
  } else if (root) {
    scroll.append(root);
  } else {
    scroll.innerHTML = parsed.innerHTML;
  }

  return scroll;
}

export async function openTermsOfServicePopup(
  onDismissed?: () => void,
  options?: { terms?: PrivacyTermsPayload; force?: boolean },
) {
  if (document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }

  const terms = options?.terms ?? (await fetchPrivacyTerms());
  if (!options?.force && !shouldShowTermsOfServicePopup(settingsState, terms)) {
    onDismissed?.();
    return;
  }

  ensurePopupStyles();

  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader">
      <h1>Terms of Service</h1>
      <p>Review the terms below, then accept or dismiss for now</p>
    </div>`,
  ).firstChild as HTMLElement;

  const scrollContent = buildTermsScrollContent(terms.whatsnew_html);

  const body = document.createElement("div");
  body.className = "whatsnewTextContainer bsplus-tos-body";

  const intro = stringToHTML(/* html */ `
    <p class="bsplus-tos-intro">
      Do you accept the terms of service? Read the full policy at
      <a href="${PRIVACY_POLICY_URL}" target="_blank" rel="noopener noreferrer">betterseqta.org/privacy</a>.
    </p>
  `).firstChild as HTMLElement;

  const actions = stringToHTML(/* html */ `
    <div class="bsplus-tos-actions">
      <button type="button" id="bsplus-tos-accept" class="bsplus-tos-btn bsplus-tos-btn--primary">
        I accept the terms of service
      </button>
      <button type="button" id="bsplus-tos-decline" class="bsplus-tos-btn bsplus-tos-btn--secondary">
        Not now
      </button>
    </div>
  `).firstChild as HTMLElement;

  body.append(intro, scrollContent, actions);

  const isDark = settingsState.DarkMode;

  openPopup({
    header,
    content: [body],
    containerClass: "whatsnewContainer--scrollBody whatsnewContainer--compact",
    backgroundClass: isDark
      ? "bsplus-tos-overlay bsplus-tos-overlay--dark"
      : "bsplus-tos-overlay",
    hideCloseButton: true,
    closeOnBackdrop: false,
    closeOnEscape: false,
    animateSelector: ".bsplus-tos-body > *",
    afterClose: onDismissed,
    actions: [
      {
        id: "bsplus-tos-accept",
        onClick: () => {
          markTermsOfServiceAccepted(settingsState, terms.last_updated);
          void closePopup();
        },
      },
      {
        id: "bsplus-tos-decline",
        onClick: () => {
          void closePopup();
        },
      },
    ],
    onReady: ({ container }) => {
      container.setAttribute("role", "dialog");
      container.setAttribute("aria-modal", "true");
      container.setAttribute("aria-labelledby", "bsplus-tos-title");
      const title = container.querySelector(".whatsnewHeader h1");
      if (title) title.id = "bsplus-tos-title";
    },
  });
}
