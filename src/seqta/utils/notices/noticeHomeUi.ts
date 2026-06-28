import { animate } from "motion";
import LogoLight from "@/resources/icons/betterseqta-light-icon.png";
import { resolveExtensionAssetUrl } from "@/lib/extensionAssetUrl";
import { GetThresholdOfColor } from "@/seqta/ui/colors/getThresholdColour";
import { getMockNotices } from "@/seqta/ui/dev/hideSensitiveContent";
import debounce from "@/seqta/utils/debounce";
import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { noticeMatchesLabelFilter } from "@/seqta/utils/notices/noticeLabelFilters";
import stringToHTML from "@/seqta/utils/stringToHTML";

export function processNoticeColor(colour: unknown): string | undefined {
  if (typeof colour !== "string") return undefined;
  const rgb = GetThresholdOfColor(colour);
  if (rgb < 100 && settingsState.DarkMode) {
    return undefined;
  }
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
  const textPreview =
    notice.contents
      .replace(/<[^>]*>/g, "")
      .replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 150) + (notice.contents.length > 150 ? "..." : "");

  const noticeId = `notice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const htmlContent = `
    <div class="notice-unified-content notice-card-state" data-notice-id="${noticeId}" style="--colour: ${colour || "#8e8e8e"}; position: relative; background: var(--background-primary); cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge" style="background: linear-gradient(135deg, ${colour || "#8e8e8e"}, ${colour || "#8e8e8e"}dd); color: white;">
            ${notice.label_title || "General"}
          </span>
          <span class="notice-staff">${notice.staff}</span>
        </div>
        <button class="notice-close-btn" style="opacity: 0; pointer-events: none;">&times;</button>
      </div>
      <h2 class="notice-content-title">${notice.title}</h2>
      <div class="notice-content-body">${textPreview}</div>
    </div>`;

  const element = stringToHTML(htmlContent).firstChild as HTMLElement;
  element.addEventListener("click", () =>
    openNoticeModal(notice, colour, element),
  );
  return element;
}

export function openNoticeModal(
  notice: any,
  colour: string | undefined,
  sourceElement: HTMLElement,
) {
  const cleanContent = notice.contents
    .replace(/\[\[[\w]+[:][\w]+[\]\]]+/g, "")
    .replace(/ +/, " ");

  document.getElementById("notice-modal")?.remove();

  const sourceRect = sourceElement.getBoundingClientRect();
  let scrollY = Math.round(window.scrollY);
  let scrollX = Math.round(window.scrollX);
  let sourceLeft = sourceRect.left;
  let sourceTop = sourceRect.top;
  let sourceWidth = sourceRect.width;
  let sourceHeight = sourceRect.height;

  const modalHtml = `
    <div id="notice-modal" class="notice-modal-overlay" style="opacity: 0;">
      <div class="notice-modal-transition" style="
        position: fixed;
        left: ${sourceLeft + scrollX}px;
        top: ${sourceTop + scrollY}px;
        width: ${sourceWidth}px;
        height: ${sourceHeight}px;
        transform-origin: center;
        z-index: 10001;
      ">
        <div class="notice-modal-content notice-transitioning">
          <div class="notice-unified-content notice-card-state">
            <div class="notice-header">
              <div class="notice-badge-row">
                <span class="notice-badge" style="background: linear-gradient(135deg, ${colour || "#8e8e8e"}, ${colour || "#8e8e8e"}dd); color: white;">
                  ${notice.label_title || "General"}
                </span>
                <span class="notice-staff">${notice.staff}</span>
              </div>
              <button class="notice-close-btn">&times;</button>
            </div>
            <h2 class="notice-content-title">${notice.title}</h2>
            <div class="notice-content-body">${cleanContent}</div>
          </div>
        </div>
      </div>
    </div>`;

  const modal = stringToHTML(modalHtml).firstChild as HTMLElement;
  const transitionContainer = modal.querySelector(
    ".notice-modal-transition",
  ) as HTMLElement;
  const unifiedContent = modal.querySelector(
    ".notice-unified-content",
  ) as HTMLElement;
  const closeBtn = modal.querySelector(".notice-close-btn") as HTMLElement;

  document.body.appendChild(modal);

  sourceElement.setAttribute("data-transitioning", "true");
  sourceElement.style.opacity = "0";
  sourceElement.style.transform = "scale(0.95)";

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let targetWidth = Math.round(
    Math.min(Math.max(sourceWidth, 800), viewportWidth - 40),
  );

  const tempMeasureDiv = document.createElement("div");
  tempMeasureDiv.style.position = "absolute";
  tempMeasureDiv.style.left = "-9999px";
  tempMeasureDiv.style.width = targetWidth + "px";
  tempMeasureDiv.style.visibility = "hidden";
  tempMeasureDiv.innerHTML = `
    <div class="notice-unified-content notice-modal-state" style="position: relative; width: 100%; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <div class="notice-header">
        <div class="notice-badge-row">
          <span class="notice-badge">${notice.label_title || "General"}</span>
          <span class="notice-staff">${notice.staff}</span>
        </div>
        <button class="notice-close-btn">&times;</button>
      </div>
      <h2 class="notice-content-title">${notice.title}</h2>
      <div class="notice-content-body">${cleanContent}</div>
    </div>
  `;
  document.body.appendChild(tempMeasureDiv);
  const measuredHeight =
    tempMeasureDiv.firstElementChild!.getBoundingClientRect().height;
  document.body.removeChild(tempMeasureDiv);

  let targetHeight = Math.round(
    Math.min(Math.max(measuredHeight + 32, 200), viewportHeight * 0.9),
  );
  let targetLeft = Math.round((viewportWidth - targetWidth) / 2);
  let targetTop = Math.round((viewportHeight - targetHeight) / 2) + scrollY;

  const closeModal = () => {
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("keydown", handleEscape);

    if (!settingsState.animations) {
      modal.remove();
      sourceElement.style.opacity = "1";
      sourceElement.style.transform = "";
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

    animate(
      transitionContainer,
      { opacity: [1, 0] },
      { duration: 0.2, delay: 0.3 },
    );

    sourceElement.style.opacity = "1";
    sourceElement.style.transform = "";

    modal.style.pointerEvents = "none";

    animate(
      transitionContainer,
      {
        left: [targetLeft + scrollX, sourceLeft + scrollX],
        top: [targetTop, sourceTop + scrollY],
        width: [targetWidth, sourceWidth],
        height: [targetHeight, sourceHeight],
        scale: [1, 1],
      },
      {
        duration: 0.35,
        type: "spring",
        stiffness: 400,
        damping: 35,
      },
    ).finished.then(async () => {
      modal.remove();
      sourceElement.removeAttribute("data-transitioning");
    });
  };

  closeBtn?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    }
  };
  document.addEventListener("keydown", handleEscape);

  const handleResize = () => {
    const newSourceRect = sourceElement.getBoundingClientRect();
    const newScrollY = Math.round(window.scrollY);
    const newScrollX = Math.round(window.scrollX);

    const computedStyle = getComputedStyle(sourceElement);
    const transform = computedStyle.transform;
    let scaleX = 1,
      scaleY = 1;

    if (transform && transform !== "none") {
      const matrix = transform.match(/matrix.*\((.+)\)/);
      if (matrix) {
        const values = matrix[1].split(", ");
        scaleX = parseFloat(values[0]);
        scaleY = parseFloat(values[3]);
      }
    }

    const newSourceWidth = newSourceRect.width / scaleX;
    const newSourceHeight = newSourceRect.height / scaleY;

    const deltaX = (newSourceWidth - newSourceRect.width) / 2;
    const deltaY = (newSourceHeight - newSourceRect.height) / 2;

    const newSourceLeft = newSourceRect.left - deltaX;
    const newSourceTop = newSourceRect.top - deltaY;

    const newViewportWidth = window.innerWidth;
    const newViewportHeight = window.innerHeight;
    const newTargetWidth = Math.round(
      Math.min(Math.max(newSourceWidth, 800), newViewportWidth - 40),
    );
    const currentHeight = unifiedContent.getBoundingClientRect().height;
    const newTargetHeight = Math.round(
      Math.min(Math.max(currentHeight + 32, 200), newViewportHeight * 0.9),
    );
    const newTargetLeft = Math.round((newViewportWidth - newTargetWidth) / 2);
    const newTargetTop =
      Math.round((newViewportHeight - newTargetHeight) / 2) + newScrollY;

    transitionContainer.style.left =
      Math.round(newTargetLeft + newScrollX) + "px";
    transitionContainer.style.top = Math.round(newTargetTop) + "px";
    transitionContainer.style.width = Math.round(newTargetWidth) + "px";
    transitionContainer.style.height = Math.round(newTargetHeight) + "px";

    sourceLeft = newSourceLeft;
    sourceTop = newSourceTop;
    sourceWidth = newSourceWidth;
    sourceHeight = newSourceHeight;
    targetLeft = newTargetLeft;
    targetTop = newTargetTop;
    targetWidth = newTargetWidth;
    targetHeight = newTargetHeight;
    scrollY = newScrollY;
    scrollX = newScrollX;
  };

  window.addEventListener("resize", handleResize);

  if (settingsState.animations) {
    animate(modal, { opacity: [0, 1] }, { duration: 0.2 });

    animate(
      transitionContainer,
      {
        left: [sourceLeft + scrollX, targetLeft + scrollX],
        top: [sourceTop + scrollY, targetTop],
        width: [sourceWidth, targetWidth],
        height: [sourceHeight, targetHeight],
        scale: [1, 1],
      },
      {
        duration: 0.5,
        type: "spring",
        stiffness: 280,
        damping: 24,
      },
    );

    unifiedContent.classList.remove("notice-card-state");
    unifiedContent.classList.add("notice-modal-state");
  } else {
    modal.style.opacity = "1";
    transitionContainer.style.left = Math.round(targetLeft + scrollX) + "px";
    transitionContainer.style.top = Math.round(targetTop) + "px";
    transitionContainer.style.width = Math.round(targetWidth) + "px";
    transitionContainer.style.height = Math.round(targetHeight) + "px";
    unifiedContent.classList.remove("notice-card-state");
    unifiedContent.classList.add("notice-modal-state");
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

  notices.forEach((notice: any) => {
    const shouldInclude =
      settingsState.mockNotices || noticeMatchesLabelFilter(notice, labelTokens);

    if (shouldInclude) {
      const colour = processNoticeColor(notice.colour);
      fragment.appendChild(createNoticeElement(notice, colour));
    }
  });

  if (fragment.childNodes.length === 0) {
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

  try {
    const data = settingsState.mockNotices
      ? getMockNotices()
      : await (
          await fetch(noticesUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            credentials: "include",
            body: JSON.stringify({ date }),
          })
        ).json();

    renderNoticesIntoContainer(containerId, data, labelTokens);
  } catch {
    renderNoticesIntoContainer(containerId, { payload: [] }, labelTokens);
  }
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

  if (dateControl) {
    dateControl.value = options.initialDate;
  }

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
