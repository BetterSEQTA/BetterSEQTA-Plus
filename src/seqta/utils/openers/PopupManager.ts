import { settingsState } from "../listeners/SettingsState";
import { fullMotionEffectsEnabled } from "@/seqta/utils/performanceMode";
import {
  animatePopupClose,
  animatePopupOpen,
} from "@/seqta/utils/popupAnimation";
import { animate as motionAnimate, stagger } from "motion";

type AnimationTarget = string | Element | Element[] | NodeList | null;

export interface PopupRoot {
  background: HTMLElement;
  container: HTMLElement;
}

export interface PopupAction {
  /** Element id inside popup content (e.g. button#bsplus-founder-badge-settings-link). */
  id: string;
  onClick: () => void | Promise<void>;
}

let isClosing = false;
let pendingAfterClose: (() => void) | undefined;
let escapeListener: ((event: KeyboardEvent) => void) | null = null;

function invokeAfterClose() {
  const fn = pendingAfterClose;
  pendingAfterClose = undefined;
  fn?.();
}

function detachEscapeListener() {
  if (!escapeListener) return;
  document.removeEventListener("keydown", escapeListener);
  escapeListener = null;
}

function attachEscapeListener() {
  detachEscapeListener();
  escapeListener = (event: KeyboardEvent) => {
    if (event.key === "Escape") void closePopup();
  };
  document.addEventListener("keydown", escapeListener);
}

export async function closePopup() {
  if (isClosing) return;
  isClosing = true;
  detachEscapeListener();

  const background = document.getElementById("whatsnewbk");
  const popup = document.getElementsByClassName("whatsnewContainer")[0] as
    | HTMLElement
    | undefined;

  if (!background || !popup) {
    isClosing = false;
    invokeAfterClose();
    return;
  }

  if (!settingsState.animations) {
    background.remove();
    isClosing = false;
    invokeAfterClose();
    return;
  }

  if (fullMotionEffectsEnabled()) {
    await (motionAnimate as any)(
      [popup, background],
      { opacity: [1, 0], scale: [1, 0.95] },
      { duration: 0.25, easing: [0.22, 0.03, 0.26, 1] },
    );
  } else {
    await animatePopupClose(background);
  }

  background.remove();
  isClosing = false;
  invokeAfterClose();
}

interface OpenPopupOptions {
  header?: Node | null;
  hero?: Node | null;
  content?: (Node | null | undefined)[];
  animateSelector?: AnimationTarget;
  /** Called once after this popup is fully closed (including skip-animation path). */
  afterClose?: () => void;
  /** When true, clears the post-update flag when this popup opens (What's New only). */
  clearJustUpdated?: boolean;
  /** Extra classes on `.whatsnewContainer` (e.g. `whatsnewContainer--scrollBody`). */
  containerClass?: string;
  /** Extra classes on `.whatsnewBackground` (e.g. frosted backdrop). */
  backgroundClass?: string;
  /** Wire click handlers for buttons/links by element id (deep links, dismiss, etc.). */
  actions?: PopupAction[];
  /** Called after the popup DOM is mounted — use for one-off setup when actions are not enough. */
  onReady?: (root: PopupRoot) => void;
  /** Hide the top-right X so the user must choose an action button. */
  hideCloseButton?: boolean;
  /** Close when clicking the dimmed backdrop. Default true. */
  closeOnBackdrop?: boolean;
  /** Close when pressing Escape. Default true. */
  closeOnEscape?: boolean;
}

function chainAfterClose(next?: () => void) {
  if (!next) return;
  const previous = pendingAfterClose;
  pendingAfterClose = () => {
    next();
    previous?.();
  };
}

function applyClassList(element: HTMLElement, classNames?: string) {
  if (!classNames) return;
  for (const name of classNames.split(/\s+/)) {
    if (name) element.classList.add(name);
  }
}

function wirePopupActions(actions?: PopupAction[]) {
  if (!actions?.length) return;
  queueMicrotask(() => {
    for (const action of actions) {
      document.getElementById(action.id)?.addEventListener("click", () => {
        void Promise.resolve(action.onClick());
      });
    }
  });
}

export function openPopup({
  header,
  hero,
  content = [],
  animateSelector = ".whatsnewTextContainer *",
  afterClose,
  clearJustUpdated = false,
  containerClass,
  backgroundClass,
  actions,
  onReady,
  hideCloseButton = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: OpenPopupOptions = {}) {
  if (document.getElementById("whatsnewbk")) {
    chainAfterClose(afterClose);
    return;
  }

  chainAfterClose(afterClose);

  const background = document.createElement("div");
  background.id = "whatsnewbk";
  background.classList.add("whatsnewBackground");
  applyClassList(background, backgroundClass);

  const container = document.createElement("div");
  container.classList.add("whatsnewContainer");
  applyClassList(container, containerClass);

  if (hero) container.append(hero);
  if (header) container.append(header);
  for (const node of content) if (node) container.append(node);

  if (!hideCloseButton) {
    const closeButton = document.createElement("div");
    closeButton.id = "whatsnewclosebutton";
    closeButton.addEventListener("click", () => void closePopup());
    container.append(closeButton);
  }

  background.append(container);
  const appContainer = document.getElementById("container") ?? document.body;
  if (!appContainer) return;
  appContainer.append(background);

  if (settingsState.animations) {
    if (fullMotionEffectsEnabled()) {
      (motionAnimate as any)(
        [container, background],
        { scale: [0, 1] },
        { type: "spring", stiffness: 220, damping: 18 },
      );

      if (animateSelector) {
        const targets =
          typeof animateSelector === "string"
            ? document.querySelectorAll(animateSelector)
            : animateSelector;

        (motionAnimate as any)(
          targets!,
          { opacity: [0, 1], y: [10, 0] },
          {
            delay: stagger(0.05, { startDelay: 0.1 }),
            duration: 0.5,
            easing: [0.22, 0.03, 0.26, 1],
          },
        );
      }
    } else {
      animatePopupOpen(background);
    }
  }

  if (clearJustUpdated) {
    delete settingsState.justupdated;
  }

  if (closeOnBackdrop) {
    background.addEventListener("click", (event) => {
      if (event.target === background) void closePopup();
    });
  }

  if (closeOnEscape) {
    attachEscapeListener();
  }
  wirePopupActions(actions);
  onReady?.({ background, container });
}
