import { settingsState } from "../listeners/SettingsState";
import { animate as motionAnimate } from "motion";

export function shouldShowEngageParentsAnnouncement(): boolean {
  return !settingsState.engageParentsAnnouncementShown;
}

/**
 * Non-blocking bottom-right toast announcing SEQTA Engage support. Shown once.
 */
export function showEngageParentsToast() {
  if (!shouldShowEngageParentsAnnouncement()) return;

  settingsState.engageParentsAnnouncementShown = true;

  const toast = document.createElement("div");
  toast.className = "bsplus-toast";
  toast.innerHTML = /* html */ `
    <div class="bsplus-toast-content">
      <strong>BetterSEQTA+ now supports <span class="seqtaEngageAccent">SEQTA Engage</span></strong>
      <p>Buy your mum a BetterSEQTA Plus! Parents now get themes, a cleaner home page, and all the Plus polish on SEQTA Engage.</p>
    </div>
    <button class="bsplus-toast-close" aria-label="Dismiss">&times;</button>
  `;

  toast.style.opacity = "0";
  document.getElementById("container")?.append(toast);

  if (settingsState.animations) {
    (motionAnimate as any)(
      toast,
      { opacity: [0, 1], y: [40, 0] },
      { duration: 0.35, easing: [0.22, 0.03, 0.26, 1] },
    );
  } else {
    toast.style.opacity = "1";
  }

  const dismiss = () => {
    if (settingsState.animations) {
      (motionAnimate as any)(
        toast,
        { opacity: [1, 0], y: [0, 40] },
        { duration: 0.2, easing: [0.22, 0.03, 0.26, 1] },
      ).then(() => toast.remove());
    } else {
      toast.remove();
    }
  };

  toast.querySelector(".bsplus-toast-close")!.addEventListener("click", dismiss);

  setTimeout(dismiss, 10000);
}
