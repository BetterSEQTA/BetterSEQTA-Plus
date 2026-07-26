import stringToHTML from "../stringToHTML";
import { closePopup, openPopup } from "./PopupManager";
import {
  findPendingFeedbackWithReplies,
  formatStatus,
  openExtensionSettingsPopup,
  removePendingFeedbackIds,
  requestOpenFeedbackInSettings,
  type FeedbackStatusItem,
} from "@/seqta/utils/feedback/client";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function OpenFeedbackReplyPopup(
  items: FeedbackStatusItem[],
  onDismissed?: () => void,
): void {
  if (!items.length || document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }

  const primary = items[0];
  const extra = items.length - 1;
  const title = primary.subject?.trim() || "Your feedback";
  const response = (primary.response ?? "").trim();
  const ids = items.map((i) => i.id);

  const header = stringToHTML(`
    <div class="whatsnewHeader">
      <h1>Feedback reply</h1>
      <p>${esc(formatStatus(primary.status))}${extra > 0 ? ` · +${extra} more` : ""}</p>
    </div>
  `).firstChild as HTMLElement;

  const text = stringToHTML(`
    <div class="whatsnewTextContainer" style="overflow-y:auto;font-size:1.2rem;line-height:1.6">
      <p style="margin-bottom:.75rem"><strong>${esc(title)}</strong></p>
      <div style="padding:.9rem 1rem;border-radius:.75rem;background:color-mix(in srgb,currentColor 8%,transparent);white-space:pre-wrap">${esc(response)}</div>
      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:1.25rem;flex-wrap:wrap">
        <button type="button" id="bsplus-feedback-reply-dismiss" style="padding:.55rem 1rem;border-radius:.6rem;border:none;cursor:pointer;font-size:1rem;background:color-mix(in srgb,currentColor 12%,transparent);color:inherit">Dismiss</button>
        <button type="button" id="bsplus-feedback-reply-view" style="padding:.55rem 1rem;border-radius:.6rem;border:none;cursor:pointer;font-size:1rem;font-weight:600;background:currentColor;color:Canvas">View reply</button>
      </div>
    </div>
  `).firstChild as HTMLElement;

  openPopup({
    header,
    content: [text],
    afterClose: () => {
      void removePendingFeedbackIds(ids).then(() => onDismissed?.());
    },
  });

  queueMicrotask(() => {
    document.getElementById("bsplus-feedback-reply-dismiss")?.addEventListener("click", () => {
      void closePopup();
    });
    document.getElementById("bsplus-feedback-reply-view")?.addEventListener("click", () => {
      requestOpenFeedbackInSettings(primary.id);
      void closePopup().then(() => openExtensionSettingsPopup());
    });
  });
}

export async function maybeQueueFeedbackReplyPopup(): Promise<
  ((goNext: () => void) => void) | null
> {
  try {
    const items = await findPendingFeedbackWithReplies();
    if (!items.length) return null;
    return (goNext) => OpenFeedbackReplyPopup(items, goNext);
  } catch {
    return null;
  }
}
