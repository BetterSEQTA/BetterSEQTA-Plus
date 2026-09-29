import browser from "webextension-polyfill";
import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { closePopup, openPopup } from "./PopupManager";

const POPUP_STYLE_ID = "bsplus-courses-fix-popup-styles";

export type CoursesAssessmentsFixPopupState = {
  onoff?: boolean;
  coursesAssessmentsFixPopupShown?: boolean;
};

export function shouldShowCoursesAssessmentsFixPopup(
  state: CoursesAssessmentsFixPopupState = settingsState,
  options?: { afterWhatsNew?: boolean },
): boolean {
  if (state.coursesAssessmentsFixPopupShown) return false;
  if (options?.afterWhatsNew) return true;
  return state.onoff === false;
}

export function shouldOfferCoursesAssessmentsReEnable(
  state: CoursesAssessmentsFixPopupState = settingsState,
): boolean {
  return state.onoff === false;
}

export function markCoursesAssessmentsFixPopupSeen(
  state: CoursesAssessmentsFixPopupState = settingsState,
): void {
  state.coursesAssessmentsFixPopupShown = true;
}

export async function reEnableBetterSeqtaFeatures(options?: {
  state?: CoursesAssessmentsFixPopupState;
  persist?: (patch: Record<string, unknown>) => Promise<void>;
  reload?: () => void;
}): Promise<void> {
  const state = options?.state ?? settingsState;
  const persist =
    options?.persist ??
    ((patch) => browser.storage.local.set(patch));
  const reload = options?.reload ?? (() => location.reload());

  markCoursesAssessmentsFixPopupSeen(state);
  state.onoff = true;
  await persist({
    onoff: true,
    coursesAssessmentsFixPopupShown: true,
  });
  reload();
}

function injectCoursesFixPopupStyles() {
  if (document.getElementById(POPUP_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = POPUP_STYLE_ID;
  style.textContent = `
    #whatsnewbk.bsplus-courses-fix-overlay {
      position: fixed !important;
      inset: 0 !important;
      display: grid !important;
      place-items: center !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      background: rgba(0, 0, 0, 0.55) !important;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 2147483000 !important;
      transform: none !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .whatsnewContainer {
      position: relative !important;
      width: min(28rem, calc(100vw - 2rem)) !important;
      height: auto !important;
      max-height: calc(100vh - 2rem) !important;
      margin: 0 !important;
      padding: 1.75rem 1.75rem 1.5rem !important;
      border-radius: 1.25rem !important;
      background: #ffffff !important;
      color: #111827 !important;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28) !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay.bsplus-courses-fix-overlay--dark .whatsnewContainer {
      background: #1f2937 !important;
      color: #ffffff !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-header {
      margin: 0 0 1rem !important;
      width: 100% !important;
      height: auto !important;
      min-height: unset !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 0.35rem !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-header h1 {
      margin: 0 !important;
      font-size: 1.75rem !important;
      font-weight: 700 !important;
      line-height: 1.15 !important;
      color: inherit !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-header p {
      margin: 0 !important;
      font-size: 0.95rem !important;
      font-weight: 500 !important;
      color: #6b7280 !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay.bsplus-courses-fix-overlay--dark .bsplus-courses-fix-header p {
      color: #d1d5db !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-body {
      display: flex !important;
      flex-direction: column !important;
      gap: 1.25rem !important;
      width: 100% !important;
      margin: 0 !important;
      overflow: visible !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-body p {
      margin: 0 !important;
      font-size: 1.1rem !important;
      line-height: 1.55 !important;
      color: inherit !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-body strong {
      font-weight: 700 !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-actions {
      display: flex !important;
      flex-direction: column !important;
      gap: 0.75rem !important;
      width: 100% !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn {
      width: 100% !important;
      min-height: 2.75rem !important;
      padding: 0.75rem 1rem !important;
      border: none !important;
      border-radius: 0.75rem !important;
      font-size: 0.95rem !important;
      font-weight: 600 !important;
      font-family: inherit !important;
      line-height: 1.25 !important;
      cursor: pointer !important;
      transition: all 0.2s ease-in-out !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn:focus {
      outline: none !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn:focus-visible {
      box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #2563eb !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay.bsplus-courses-fix-overlay--dark .bsplus-courses-fix-btn:focus-visible {
      box-shadow: 0 0 0 2px #1f2937, 0 0 0 4px #2563eb !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn--primary {
      background: #2563eb !important;
      color: #ffffff !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn--primary:hover:not(:disabled) {
      background: #1d4ed8 !important;
      transform: scale(1.02) !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn--later {
      background: rgba(17, 24, 39, 0.08) !important;
      color: #111827 !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay.bsplus-courses-fix-overlay--dark .bsplus-courses-fix-btn--later {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #ffffff !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn--later:hover:not(:disabled) {
      background: rgba(17, 24, 39, 0.14) !important;
      transform: scale(1.02) !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay.bsplus-courses-fix-overlay--dark .bsplus-courses-fix-btn--later:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.16) !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn:active:not(:disabled) {
      transform: scale(0.98) !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn:disabled {
      opacity: 0.7 !important;
      cursor: wait !important;
    }

    #whatsnewbk.bsplus-courses-fix-overlay .bsplus-courses-fix-btn::after {
      display: none !important;
      content: none !important;
    }
  `;
  document.head.appendChild(style);
}

function setPopupButtonsDisabled(disabled: boolean) {
  const reenable = document.getElementById(
    "bsplus-courses-fix-reenable",
  ) as HTMLButtonElement | null;
  const later = document.getElementById(
    "bsplus-courses-fix-later",
  ) as HTMLButtonElement | null;
  const dismiss = document.getElementById(
    "bsplus-courses-fix-dismiss",
  ) as HTMLButtonElement | null;
  if (reenable) reenable.disabled = disabled;
  if (later) later.disabled = disabled;
  if (dismiss) dismiss.disabled = disabled;
}

export function OpenCoursesAssessmentsFixPopup(
  onDismissed?: () => void,
  options?: { afterWhatsNew?: boolean },
) {
  if (document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }
  if (!shouldShowCoursesAssessmentsFixPopup(settingsState, options)) {
    onDismissed?.();
    return;
  }

  injectCoursesFixPopupStyles();

  const offerReEnable = shouldOfferCoursesAssessmentsReEnable();
  const isDark =
    settingsState.DarkMode === true ||
    document.documentElement.classList.contains("dark");

  const header = stringToHTML(/* html */ `
    <div class="whatsnewHeader bsplus-courses-fix-header">
      <h1 id="bsplus-courses-fix-title">Sorry!</h1>
      <p>A quick update from BetterSEQTA+</p>
    </div>
  `).firstChild as HTMLElement;

  const bodyCopy = offerReEnable
    ? `We have <strong>fixed Courses and Assessments</strong>.
        You can safely turn BetterSEQTA features back on.`
    : `We have <strong>fixed Courses and Assessments</strong>.
        They're working again now.`;

  const actionsHtml = offerReEnable
    ? `<button type="button" id="bsplus-courses-fix-reenable" class="bsplus-courses-fix-btn bsplus-courses-fix-btn--primary">
          Re-enable BetterSEQTA
        </button>
        <button type="button" id="bsplus-courses-fix-later" class="bsplus-courses-fix-btn bsplus-courses-fix-btn--later">
          Enable later
        </button>`
    : `<button type="button" id="bsplus-courses-fix-dismiss" class="bsplus-courses-fix-btn bsplus-courses-fix-btn--primary">
          Got it
        </button>`;

  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer bsplus-courses-fix-body">
      <p>
        ${bodyCopy}
      </p>
      <div class="bsplus-courses-fix-actions">
        ${actionsHtml}
      </div>
    </div>
  `).firstChild as HTMLElement;

  const actions = offerReEnable
    ? [
        {
          id: "bsplus-courses-fix-reenable",
          onClick: async () => {
            setPopupButtonsDisabled(true);
            await reEnableBetterSeqtaFeatures();
          },
        },
        {
          id: "bsplus-courses-fix-later",
          onClick: () => {
            markCoursesAssessmentsFixPopupSeen();
            void closePopup();
          },
        },
      ]
    : [
        {
          id: "bsplus-courses-fix-dismiss",
          onClick: () => {
            markCoursesAssessmentsFixPopupSeen();
            void closePopup();
          },
        },
      ];

  openPopup({
    header,
    content: [text],
    containerClass: "whatsnewContainer--compact",
    backgroundClass: isDark
      ? "bsplus-courses-fix-overlay bsplus-courses-fix-overlay--dark"
      : "bsplus-courses-fix-overlay",
    hideCloseButton: true,
    closeOnBackdrop: false,
    closeOnEscape: false,
    afterClose: () => {
      markCoursesAssessmentsFixPopupSeen();
      onDismissed?.();
    },
    onReady: ({ container }) => {
      container.setAttribute("role", "dialog");
      container.setAttribute("aria-modal", "true");
      container.setAttribute("aria-labelledby", "bsplus-courses-fix-title");
    },
    actions,
  });
}
