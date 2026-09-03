import {
  changeSettingsClicked,
  closeExtensionPopup,
  SettingsClicked,
} from "../Closers/closeExtensionPopup";

let isSettingsRendered = false;
let settingsLoadPromise: Promise<void> | null = null;
let resizerAttached = false;

function extensionOutsideClickHandler(extensionPopup: HTMLElement) {
  return (event: MouseEvent) => {
    if (!SettingsClicked) return;

    const target = event.target;
    if (!(target instanceof Node)) return;

    if (extensionPopup.shadowRoot?.contains(target)) return;
    if (target instanceof HTMLElement && target.closest(".feedback-overlay")) return;
    if (target instanceof HTMLElement && target.closest("#AddedSettings")) return;
    if (target === extensionPopup) return;

    changeSettingsClicked(closeExtensionPopup());
  };
}

function ensureSettingsResizer() {
  if (resizerAttached) return;
  resizerAttached = true;
  void import("@/seqta/ui/SettingsResizer").then(({ SettingsResizer }) => {
    new SettingsResizer();
  });
}

/**
 * Mount the settings host on `document.body` so `position: fixed` covers the
 * viewport on both SEQTA Learn and SEQTA Engage (Engage often lacks `#container`
 * or wraps the app in stacking contexts that clip in-app overlays).
 */
export function addExtensionSettings() {
  if (document.getElementById("ExtensionPopup")) return;

  const extensionPopup = document.createElement("div");
  extensionPopup.classList.add("outside-container", "hide");
  extensionPopup.id = "ExtensionPopup";

  document.body.appendChild(extensionPopup);

  const handler = extensionOutsideClickHandler(extensionPopup);
  document.body.addEventListener("click", handler, false);
}

async function loadSettingsUi(extensionPopup: HTMLElement): Promise<void> {
  if (isSettingsRendered) return;

  ensureSettingsResizer();

  const [{ default: renderSvelte }, { default: Settings }] = await Promise.all([
    import("@/interface/main"),
    import("@/interface/pages/settings.svelte"),
  ]);

  const shadow = extensionPopup.attachShadow({ mode: "open" });
  renderSvelte(Settings, shadow);
  isSettingsRendered = true;
}

export async function renderSettingsIfNeeded(): Promise<void> {
  if (isSettingsRendered) return;

  const extensionPopup = document.getElementById("ExtensionPopup");
  if (!extensionPopup) return;

  if (!settingsLoadPromise) {
    settingsLoadPromise = loadSettingsUi(extensionPopup).catch((err) => {
      settingsLoadPromise = null;
      console.error(err);
      throw err;
    });
  }

  await settingsLoadPromise;
}
