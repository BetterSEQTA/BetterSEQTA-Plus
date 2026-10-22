import stringToHTML from "@/seqta/utils/stringToHTML";
import { createPopupHeroVideo } from "@/seqta/utils/Openers/attachPopupMediaFullscreen";
import { closePopup, openPopup } from "@/seqta/utils/Openers/PopupManager";
import { mount, unmount } from "svelte";
import TimetableClassmatesOptInPopup from "./TimetableClassmatesOptInPopup.svelte";
import TimetableClassmatesOptOutPopup from "./TimetableClassmatesOptOutPopup.svelte";
import popupStyles from "./consentPopup.css?inline";
import { cloudAuth } from "@/seqta/utils/CloudAuth";
import { loadSession } from "./rosterStore";
import {
  clearResumeOptInAfterCloudLogin,
  shouldResumeOptInAfterCloudLogin,
} from "./optInResume";

const STYLE_ID = "bsplus-timetable-classmates-popup-styles";
const CLASSMATES_VIDEO_URL =
  "https://raw.githubusercontent.com/BetterSEQTA/BetterSEQTA-Plus/refs/heads/main/src/resources/timetable-classmates.webm";

function ensurePopupStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = popupStyles;
  document.head.appendChild(style);
}

type ConsentPopupOptions = {
  onDismiss?: () => void;
  /** Fires once the popup shell is ready (Svelte mounted). */
  onOpened?: () => void;
  heroVideo?: boolean;
};

function openConsentPopup(
  title: string,
  subtitle: string,
  component: typeof TimetableClassmatesOptInPopup | typeof TimetableClassmatesOptOutPopup,
  props: Record<string, unknown>,
  options?: ConsentPopupOptions,
): void {
  if (document.getElementById("whatsnewbk")) return;
  ensurePopupStyles();

  let app: ReturnType<typeof mount> | null = null;
  let completed = false;
  const host = document.createElement("div");
  host.className = "whatsnewTextContainer bsplus-timetable-classmates-popup-host";

  const header = stringToHTML(/* html */ `
    <div class="whatsnewHeader"><h1>${title}</h1><p>${subtitle}</p></div>
  `).firstChild as HTMLElement;

  const hero = options?.heroVideo
    ? createPopupHeroVideo(CLASSMATES_VIDEO_URL, "Timetable classmates preview")
    : null;

  openPopup({
    header,
    content: hero ? [hero, host] : [host],
    containerClass: "whatsnewContainer--scrollBody",
    backgroundClass: "bsplus-popup-backdrop--lite",
    animateSelector: hero
      ? ".whatsnewImgContainer, .bsplus-timetable-classmates-popup-host > *"
      : ".bsplus-timetable-classmates-popup-host > *",
    afterClose: () => {
      if (app) unmount(app);
      if (!completed) options?.onDismiss?.();
    },
    onReady: () => {
      app = mount(component, {
        target: host,
        props: {
          ...props,
          onCancel: () => void closePopup(),
          onComplete: () => {
            completed = true;
            void closePopup();
          },
        },
      });
      options?.onOpened?.();
    },
  });
}

export function openTimetableClassmatesOptInPopup(options: {
  onAccepted: () => void | Promise<void>;
  onDismiss?: () => void;
  /** Clears post–cloud-login resume flag as soon as the modal is shown (one-shot reopen). */
  onOpened?: () => void;
}): void {
  openConsentPopup(
    "Timetable classmates",
    "Share class lists with opted-in students at your school",
    TimetableClassmatesOptInPopup,
    { onAccepted: options.onAccepted },
    {
      onDismiss: options.onDismiss,
      onOpened: options.onOpened,
      heroVideo: true,
    },
  );
}

async function openResumeOptInIfNeeded(): Promise<void> {
  if (!shouldResumeOptInAfterCloudLogin()) return;
  if (document.getElementById("whatsnewbk")) return;

  const token = await cloudAuth.getStoredToken();
  if (!token) return;

  const session = await loadSession();
  if (session.syncOptIn) {
    clearResumeOptInAfterCloudLogin();
    return;
  }

  openTimetableClassmatesOptInPopup({
    onAccepted: () => {},
    onOpened: () => clearResumeOptInAfterCloudLogin(),
  });
}

/** After cloud OAuth refreshes the page, reopen opt-in if the user started sign-in from this flow. */
export async function maybeResumeTimetableClassmatesOptInPopup(): Promise<void> {
  if (!shouldResumeOptInAfterCloudLogin()) return;

  if (await cloudAuth.getStoredToken()) {
    await openResumeOptInIfNeeded();
    return;
  }

  const unsub = cloudAuth.subscribe((state) => {
    if (!state.isLoggedIn) return;
    unsub();
    void openResumeOptInIfNeeded();
  });
}

export function openTimetableClassmatesOptOutPopup(options: {
  onConfirmed: () => void | Promise<void>;
  onDismiss?: () => void;
}): void {
  openConsentPopup(
    "Stop classmate sharing",
    "You can turn this back on anytime",
    TimetableClassmatesOptOutPopup,
    { onConfirmed: options.onConfirmed },
    { onDismiss: options.onDismiss },
  );
}

export function openClassmatesRosterPopup(
  title: string,
  peers: { displayName: string; initials: string; houseColour?: string }[],
): void {
  if (document.getElementById("whatsnewbk")) return;

  const list = document.createElement("ul");
  list.className = "bsplus-classmates-roster-list";
  for (const peer of peers) {
    const li = document.createElement("li");
    li.className = "bsplus-classmates-roster-item";
    const avatar = document.createElement("span");
    avatar.className = "bsplus-classmates-roster-avatar";
    if (peer.houseColour) avatar.style.setProperty("--bsplus-house-color", peer.houseColour);
    avatar.textContent = peer.initials;
    const name = document.createElement("span");
    name.className = "bsplus-classmates-roster-name";
    name.textContent = peer.displayName;
    li.append(avatar, name);
    list.append(li);
  }

  const host = document.createElement("div");
  host.className = "whatsnewTextContainer bsplus-classmates-roster-popup";
  host.append(list);

  const header = document.createElement("div");
  header.className = "whatsnewHeader";
  const heading = document.createElement("h1");
  heading.textContent = title;
  const subtitle = document.createElement("p");
  subtitle.textContent = `${peers.length} classmate${peers.length === 1 ? "" : "s"} in this class`;
  header.append(heading, subtitle);

  openPopup({
    header,
    content: [host],
    containerClass: "whatsnewContainer--scrollBody",
    backgroundClass: "bsplus-popup-backdrop--lite",
    animateSelector: ".bsplus-classmates-roster-popup",
    afterClose: () => {},
  });
}
