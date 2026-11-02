import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { getApiBase } from "../DevApiBase";
import { closePopup, openPopup } from "./PopupManager";
import fallbackTerms from "@/exampletermsresponse.json";
import type { SettingsState } from "@/types/storage";

export const TERMS_OF_SERVICE_URL = "https://betterseqta.org/terms";
export const PRIVACY_POLICY_URL = "https://betterseqta.org/privacy";

const TERMS_FETCH_TIMEOUT_MS = 8_000;

/** Shared shape for `GET /api/terms` and `GET /api/privacy`. */
export interface LegalDocumentPayload {
  last_updated: string;
  whatsnew_html: string;
}

function isLegalDocumentPayload(data: unknown): data is LegalDocumentPayload {
  return (
    !!data &&
    typeof data === "object" &&
    typeof (data as LegalDocumentPayload).last_updated === "string" &&
    typeof (data as LegalDocumentPayload).whatsnew_html === "string" &&
    !!(data as LegalDocumentPayload).whatsnew_html.trim()
  );
}

export function getFallbackTermsOfService(): LegalDocumentPayload {
  return fallbackTerms as LegalDocumentPayload;
}

/** Loads Terms of Service body from `GET /api/terms`. */
export async function fetchTermsOfService(): Promise<LegalDocumentPayload> {
  try {
    const res = await fetch(`${getApiBase()}/api/terms`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TERMS_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return getFallbackTermsOfService();
    const data: unknown = await res.json();
    if (!isLegalDocumentPayload(data)) return getFallbackTermsOfService();
    return data;
  } catch (err) {
    console.warn("[TermsOfService] Failed to fetch terms:", err);
    return getFallbackTermsOfService();
  }
}

/** @deprecated Use {@link fetchTermsOfService}. */
export const fetchPrivacyTerms = fetchTermsOfService;

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
  terms: LegalDocumentPayload,
): boolean {
  return termsVersionIsNewer(terms.last_updated, resolvedTermsAcceptance(state));
}

export function markTermsOfServiceAccepted(
  state: Pick<SettingsState, "termsOfServiceLastAccepted">,
  lastUpdated: string,
): void {
  state.termsOfServiceLastAccepted = lastUpdated;
}

function buildTermsScrollContent(html: string): HTMLElement {
  const parsed = stringToHTML(html);
  const root = parsed.firstElementChild as HTMLElement | null;
  const scroll = document.createElement("div");
  scroll.className = "bsplus-tos-scroll privacyStatement";
  scroll.setAttribute("tabindex", "0");
  scroll.setAttribute("aria-label", "Terms of service");

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
  options?: { terms?: LegalDocumentPayload; force?: boolean },
) {
  if (document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }

  const terms = options?.terms ?? (await fetchTermsOfService());
  if (!options?.force && !shouldShowTermsOfServicePopup(settingsState, terms)) {
    onDismissed?.();
    return;
  }

  const header = stringToHTML(
    /* html */
    `<div class="whatsnewHeader bsplus-tos-header">
      <h1>Terms of Service</h1>
      <p>Scroll to read the full terms, then accept or dismiss for now</p>
    </div>`,
  ).firstChild as HTMLElement;

  const scrollContent = buildTermsScrollContent(terms.whatsnew_html);

  const body = document.createElement("div");
  body.className = "whatsnewTextContainer bsplus-tos-body";

  const intro = stringToHTML(/* html */ `
    <p class="bsplus-tos-intro privacyStatement">
      Do you accept the terms of service?
      <a href="${TERMS_OF_SERVICE_URL}" target="_blank" rel="noopener noreferrer">Terms</a>
      ·
      <a href="${PRIVACY_POLICY_URL}" target="_blank" rel="noopener noreferrer">Privacy</a>
    </p>
  `).firstChild as HTMLElement;

  const actions = stringToHTML(/* html */ `
    <div class="bsplus-tos-actions">
      <button type="button" id="bsplus-tos-decline" class="bsplus-tos-btn bsplus-tos-btn--secondary">
        Not now
      </button>
      <button type="button" id="bsplus-tos-accept" class="bsplus-tos-btn bsplus-tos-btn--primary">
        I accept the terms of service
      </button>
    </div>
  `).firstChild as HTMLElement;

  body.append(intro, scrollContent, actions);

  openPopup({
    header,
    content: [body],
    containerClass: "bsplus-tos-container",
    backgroundClass: "bsplus-tos-overlay",
    hideCloseButton: true,
    closeOnBackdrop: false,
    closeOnEscape: false,
    animateSelector: ".bsplus-tos-header *, .bsplus-tos-body > *",
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
