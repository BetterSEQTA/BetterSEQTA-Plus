import { animate } from "motion";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { getMockNotices } from "@/seqta/ui/dev/hideSensitiveContent";
import debounce from "@/seqta/utils/debounce";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { noticeMatchesLabelFilter } from "@/seqta/utils/notices/noticeLabelFilters";
import stringToHTML from "@/seqta/utils/stringToHTML";

const PLACEHOLDER_RE = /\[\[[\w]+[:][\w]+[\]\]]+/g;
const SPRING_OPEN = { type: "spring" as const, stiffness: 280, damping: 24, duration: 0.5 };
const SPRING_CLOSE = { type: "spring" as const, stiffness: 400, damping: 35, duration: 0.35 };

const colourStr = (colour?: string) => colour || "#8e8e8e";

function stripPlaceholders(html: string): string {
  return html.replace(PLACEHOLDER_RE, "");
}

function noticePreview(contents: string): string {
  const text = stripPlaceholders(contents)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.substring(0, 150) + (contents.length > 150 ? "..." : "");
}

function noticeBody(contents: string): string {
  return stripPlaceholders(contents).replace(/ +/, " ");
}

type NoticeCardOpts = {
  wrapperClass?: string;
  wrapperStyle?: string;
  hideClose?: boolean;
};

function noticeCardHtml(
  notice: { title: string; staff: string; label_title?: string },
  colour: string | undefined,
  body: string,
  opts: NoticeCardOpts = {},
): string {
  const c = colourStr(colour);
  const closeBtn = opts.hideClose
    ? '<button class="notice-close-btn" style="opacity: 0; pointer-events: none;">&times;</button>'
    : '<button class="notice-close-btn">&times;</button>';
  return `<div class="notice-unified-content ${opts.wrapperClass ?? "notice-card-state"}" style="--colour: ${c}; ${opts.wrapperStyle ?? ""}">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge" style="background: linear-gradient(135deg, ${c}, ${c}dd); color: white;">${notice.label_title || "General"}</span>
          <span class="notice-staff">${notice.staff}</span>
        </div>
        ${closeBtn}
      </div>
      <h2 class="notice-content-title">${notice.title}</h2>
      <div class="notice-content-body">${body}</div>
    </div>`;
}

function modalTargetSize(sourceWidth: number, contentHeight: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scrollY = Math.round(window.scrollY);
  const width = Math.round(Math.min(Math.max(sourceWidth, 800), vw - 40));
  const height = Math.round(Math.min(Math.max(contentHeight + 32, 200), vh * 0.9));
  return {
    width,
    height,
    left: Math.round((vw - width) / 2),
    top: Math.round((vh - height) / 2) + scrollY,
    scrollX: Math.round(window.scrollX),
    scrollY,
  };
}

function measureNoticeHeight(
  notice: { title: string; staff: string; label_title?: string },
  body: string,
  targetWidth: number,
): number {
  const measure = document.createElement("div");
  measure.style.cssText = `position:absolute;left:-9999px;width:${targetWidth}px;visibility:hidden`;
  measure.innerHTML = noticeCardHtml(notice, undefined, body, {
    wrapperClass: "notice-modal-state",
    wrapperStyle:
      "position:relative;width:100%;padding:16px;border:1px solid rgba(255,255,255,0.1)",
  });
  document.body.appendChild(measure);
  const height = measure.firstElementChild!.getBoundingClientRect().height;
  measure.remove();
  return height;
}

function showSourceElement(el: HTMLElement) {
  el.style.opacity = "1";
  el.style.transform = "";
}

function elementScale(el: HTMLElement) {
  const transform = getComputedStyle(el).transform;
  if (!transform || transform === "none") return { x: 1, y: 1 };
  const match = transform.match(/matrix.*\((.+)\)/);
  if (!match) return { x: 1, y: 1 };
  const values = match[1].split(", ");
  return { x: parseFloat(values[0]), y: parseFloat(values[3]) };
}

export function processNoticeColor(colour: unknown): string | undefined {
  if (typeof colour !== "string") return undefined;
  const rgb = GetThresholdOfColor(colour);
  if (rgb < 100 && settingsState.DarkMode) return undefined;
  return colour;
}

export function appendNoticeEmptyState(container: HTMLElement, message: string) {
  const emptyState = document.createElement("div");
  emptyState.classList.add("day-empty");
  const img = document.createElement("img");
  img.src = resolveExtensionAssetUrl(LogoLight);
  const text = document.createElement("p");
  text.innerText = message;
  emptyState.append(img, text);
  container.append(emptyState);
}

function createNoticeElement(notice: any, colour: string | undefined): Node {
  const htmlContent = noticeCardHtml(notice, colour, noticePreview(notice.contents), {
    wrapperStyle:
      "position: relative; background: var(--background-primary); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.1);",
    hideClose: true,
  });
  const element = stringToHTML(htmlContent).firstChild as HTMLElement;
  element.addEventListener("click", () => openNoticeModal(notice, colour, element));
  return element;
}

export function openNoticeModal(
  notice: any,
  colour: string | undefined,
  sourceElement: HTMLElement,
) {
  const cleanContent = noticeBody(notice.contents);
  document.getElementById("notice-modal")?.remove();

  const sourceRect = sourceElement.getBoundingClientRect();
  let scrollY = Math.round(window.scrollY);
  let scrollX = Math.round(window.scrollX);
  let sourceLeft = sourceRect.left;
  let sourceTop = sourceRect.top;
  let sourceWidth = sourceRect.width;
  let sourceHeight = sourceRect.height;

  const modalHtml = `<div id="notice-modal" class="notice-modal-overlay" style="opacity: 0;">
      <div class="notice-modal-transition" style="position:fixed;left:${sourceLeft + scrollX}px;top:${sourceTop + scrollY}px;width:${sourceWidth}px;height:${sourceHeight}px;transform-origin:center;z-index:10001;">
        <div class="notice-modal-content notice-transitioning">
          ${noticeCardHtml(notice, colour, cleanContent)}
        </div>
      </div>
    </div>`;

  const modal = stringToHTML(modalHtml).firstChild as HTMLElement;
  const transitionContainer = modal.querySelector(".notice-modal-transition") as HTMLElement;
  const unifiedContent = modal.querySelector(".notice-unified-content") as HTMLElement;
  const closeBtn = modal.querySelector(".notice-close-btn") as HTMLElement;
  document.body.appendChild(modal);

  sourceElement.setAttribute("data-transitioning", "true");
  sourceElement.style.opacity = "0";
  sourceElement.style.transform = "scale(0.95)";

  const initialWidth = Math.round(
    Math.min(Math.max(sourceWidth, 800), window.innerWidth - 40),
  );
  const measuredHeight = measureNoticeHeight(notice, cleanContent, initialWidth);
  let { width: targetWidth, height: targetHeight, left: targetLeft, top: targetTop } =
    modalTargetSize(sourceWidth, measuredHeight);

  const applyTargetLayout = () => {
    transitionContainer.style.left = `${Math.round(targetLeft + scrollX)}px`;
    transitionContainer.style.top = `${Math.round(targetTop)}px`;
    transitionContainer.style.width = `${Math.round(targetWidth)}px`;
    transitionContainer.style.height = `${Math.round(targetHeight)}px`;
  };

  const closeModal = () => {
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("keydown", handleEscape);

    if (!settingsState.animations) {
      modal.remove();
      showSourceElement(sourceElement);
      sourceElement.removeAttribute("data-transitioning");
      return;
    }

    animate(
      modal,
      {
        backgroundColor: ["rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 0)"],
        backdropFilter: ["blur(4px)", "blur(0px)"],
      },
      { duration: 0.2 },
    );
    animate(transitionContainer, { opacity: [1, 0] }, { duration: 0.2, delay: 0.3 });
    showSourceElement(sourceElement);
    modal.style.pointerEvents = "none";
    animate(transitionContainer, {
      left: [targetLeft + scrollX, sourceLeft + scrollX],
      top: [targetTop, sourceTop + scrollY],
      width: [targetWidth, sourceWidth],
      height: [targetHeight, sourceHeight],
    }, SPRING_CLOSE).finished.then(() => {
      modal.remove();
      sourceElement.removeAttribute("data-transitioning");
    });
  };

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") closeModal();
  };
  document.addEventListener("keydown", handleEscape);

  const handleResize = () => {
    const rect = sourceElement.getBoundingClientRect();
    scrollY = Math.round(window.scrollY);
    scrollX = Math.round(window.scrollX);
    const scale = elementScale(sourceElement);
    sourceWidth = rect.width / scale.x;
    sourceHeight = rect.height / scale.y;
    sourceLeft = rect.left - (sourceWidth - rect.width) / 2;
    sourceTop = rect.top - (sourceHeight - rect.height) / 2;

    const next = modalTargetSize(
      sourceWidth,
      unifiedContent.getBoundingClientRect().height,
    );
    targetLeft = next.left;
    targetTop = next.top;
    targetWidth = next.width;
    targetHeight = next.height;
    applyTargetLayout();
  };

  window.addEventListener("resize", handleResize);

  unifiedContent.classList.replace("notice-card-state", "notice-modal-state");
  if (settingsState.animations) {
    animate(modal, { opacity: [0, 1] }, { duration: 0.2 });
    animate(transitionContainer, {
      left: [sourceLeft + scrollX, targetLeft + scrollX],
      top: [sourceTop + scrollY, targetTop],
      width: [sourceWidth, targetWidth],
      height: [sourceHeight, targetHeight],
    }, SPRING_OPEN);
  } else {
    modal.style.opacity = "1";
    applyTargetLayout();
  }
}

export function renderNoticesIntoContainer(
  containerId: string,
  response: { payload?: unknown },
  labelTokens: string[],
  emptyMessage = "No notices for today.",
): void {
  const noticeContainer = document.getElementById(containerId);
  if (!noticeContainer) return;

  noticeContainer.classList.remove("loading");
  noticeContainer.innerHTML = "";

  const notices = response?.payload;
  if (!Array.isArray(notices) || !notices.length) {
    appendNoticeEmptyState(noticeContainer, emptyMessage);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const notice of notices) {
    if (
      settingsState.mockNotices ||
      noticeMatchesLabelFilter(notice, labelTokens)
    ) {
      fragment.appendChild(createNoticeElement(notice, processNoticeColor(notice.colour)));
    }
  }

  if (!fragment.childNodes.length) {
    appendNoticeEmptyState(noticeContainer, emptyMessage);
    return;
  }
  noticeContainer.appendChild(fragment);
}

export async function fetchNoticesForDate(
  containerId: string,
  date: string,
  noticesUrl: string,
  labelTokens: string[],
): Promise<void> {
  const container = document.getElementById(containerId);
  if (container) {
    container.classList.add("loading");
    container.innerHTML = "";
  }

  let data: { payload?: unknown };
  try {
    data = settingsState.mockNotices
      ? getMockNotices()
      : await (
          await fetch(noticesUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            credentials: "include",
            body: JSON.stringify({ date }),
          })
        ).json();
  } catch {
    data = { payload: [] };
  }
  renderNoticesIntoContainer(containerId, data, labelTokens);
}

export type SetupNoticesSectionOptions = {
  containerId: string;
  dateInput: HTMLInputElement | string;
  noticesUrl: string;
  labelTokens: string[];
  initialDate: string;
};

/** Wire date picker + initial fetch for a home-page notices block. Returns cleanup. */
export function setupNoticesSection(options: SetupNoticesSectionOptions): () => void {
  const dateControl =
    typeof options.dateInput === "string"
      ? (document.querySelector(options.dateInput) as HTMLInputElement | null)
      : options.dateInput;

  if (dateControl) dateControl.value = options.initialDate;

  const debouncedInputChange = debounce((e: Event) => {
    void fetchNoticesForDate(
      options.containerId,
      (e.target as HTMLInputElement).value,
      options.noticesUrl,
      options.labelTokens,
    );
  }, 250);

  dateControl?.addEventListener("input", debouncedInputChange);
  void fetchNoticesForDate(
    options.containerId,
    options.initialDate,
    options.noticesUrl,
    options.labelTokens,
  );

  return () => dateControl?.removeEventListener("input", debouncedInputChange);
}
