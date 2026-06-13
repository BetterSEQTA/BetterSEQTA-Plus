import browser from "webextension-polyfill";
import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { closePopup } from "./PopupManager";
import { getApiBase } from "../DevApiBase";
import { openThemeStoreWithHighlight } from "../openThemeStoreWithHighlight";
import { cloudAuth } from "../CloudAuth";
import type { Theme } from "@/interface/types/Theme";
import {
  buildModalHeroSlides,
  normalizeStoreTheme,
} from "@/interface/utils/themeStoreFlavours";
import { attachPopupMediaFullscreen } from "./attachPopupMediaFullscreen";

export interface ThemeOfTheMonthEntry {
  id: string;
  month: string;
  title: string;
  description: string;
  cover_image: string | null;
  theme_id: string | null;
  theme: { id: string; name: string; slug: string } | null;
  created_at: number;
  updated_at: number;
}

export async function fetchThemeOfTheMonth(): Promise<ThemeOfTheMonthEntry | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/theme-of-the-month/current`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || !data.id) return null;
    return data as ThemeOfTheMonthEntry;
  } catch (err) {
    console.warn("[ThemeOfTheMonth] Failed to fetch current entry:", err);
    return null;
  }
}

export function shouldShowThemeOfTheMonth(entry: ThemeOfTheMonthEntry | null): boolean {
  if (!entry || settingsState.themeOfTheMonthDisabled) return false;
  return settingsState.themeOfTheMonthDismissedMonth !== entry.month;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMonthLabel(month: string): string {
  const [yyyy, mm] = month.split("-");
  if (!yyyy || !mm) return month;
  const date = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

function heroUrlFromStoreTheme(theme: {
  marqueeImage?: string | null;
  coverImage?: string | null;
}): string | null {
  const url = (theme.marqueeImage || theme.coverImage || "").trim();
  return url || null;
}

export async function fetchThemeStoreTheme(themeId: string): Promise<Theme | null> {
  try {
    const token = await cloudAuth.getStoredToken();
    const res = (await browser.runtime.sendMessage({
      type: "fetchThemeDetails",
      themeId,
      token: token ?? undefined,
    })) as { success?: boolean; data?: { theme?: Record<string, unknown> } };

    if (!res?.success || !res?.data?.theme) return null;
    return normalizeStoreTheme(res.data.theme);
  } catch (err) {
    console.warn("[ThemeOfTheMonth] Failed to fetch theme store details:", err);
    return null;
  }
}

export async function fetchThemeStoreHeroImage(themeId: string): Promise<string | null> {
  const theme = await fetchThemeStoreTheme(themeId);
  return theme ? heroUrlFromStoreTheme(theme) : null;
}

type PopupGallerySlide = { imageUrl: string; caption: string };

function buildPopupGallerySlides(
  entry: ThemeOfTheMonthEntry,
  storeTheme: Theme | null,
  heroUrl: string | null,
): PopupGallerySlide[] {
  if (storeTheme) {
    return buildModalHeroSlides(storeTheme).filter((s) => s.imageUrl.trim());
  }
  if (heroUrl) {
    return [{ imageUrl: heroUrl, caption: entry.title }];
  }
  return [];
}

/** Store theme identity on the hero — not the TOTM notice copy in the body. */
function renderHeroEmbossHtml(storeTheme: Theme, entry: ThemeOfTheMonthEntry): string {
  const name = (storeTheme.name || entry.title).trim();
  const author = storeTheme.author?.trim() ?? "";
  const storeDescription = storeTheme.description?.trim() ?? "";
  const entryDesc = entry.description.trim();
  const showDescription =
    storeDescription.length > 0 && storeDescription !== entryDesc;
  const flavourCount = storeTheme.flavours?.length ?? 0;
  const flavourLine =
    flavourCount > 0
      ? `${flavourCount} colour variant${flavourCount === 1 ? "" : "s"}`
      : "";

  if (!name && !author && !showDescription && !flavourLine) return "";

  return `
    <div class="themeOfTheMonthCardHeroEmboss">
      <div class="themeOfTheMonthCardHeroEmbossScrim" aria-hidden="true"></div>
      <div class="themeOfTheMonthCardHeroEmbossContent">
        <h3 class="themeOfTheMonthCardHeroEmbossTitle">${escapeHTML(name)}</h3>
        ${author ? `<p class="themeOfTheMonthCardHeroEmbossAuthor">By ${escapeHTML(author)}</p>` : ""}
        ${
          showDescription
            ? `<p class="themeOfTheMonthCardHeroEmbossDescription">${escapeHTML(storeDescription).replace(/\n/g, "<br />")}</p>`
            : ""
        }
        ${flavourLine ? `<p class="themeOfTheMonthCardHeroEmbossVariants">${escapeHTML(flavourLine)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderGallerySlidesHtml(slides: PopupGallerySlide[]): string {
  if (slides.length === 0) return "";
  const slidesHtml = slides
    .map(
      (s, i) => `
        <figure class="themeOfTheMonthCardGallerySlide" data-slide="${i}">
          <img src="${escapeHTML(s.imageUrl)}" alt="${escapeHTML(s.caption)}" loading="lazy" />
          <figcaption>${escapeHTML(s.caption)}</figcaption>
        </figure>
      `,
    )
    .join("");
  const nav =
    slides.length > 1
      ? `
        <button type="button" class="themeOfTheMonthCardGalleryPrev" aria-label="Previous image">‹</button>
        <button type="button" class="themeOfTheMonthCardGalleryNext" aria-label="Next image">›</button>
        <div class="themeOfTheMonthCardGalleryDots" role="tablist" aria-label="Theme previews">
          ${slides
            .map(
              (_, i) =>
                `<button type="button" class="themeOfTheMonthCardGalleryDot${i === 0 ? " themeOfTheMonthCardGalleryDotActive" : ""}" data-slide="${i}" role="tab" aria-label="Image ${i + 1} of ${slides.length}" aria-selected="${i === 0 ? "true" : "false"}"></button>`,
            )
            .join("")}
        </div>
      `
      : "";
  return `
    <div class="themeOfTheMonthCardGallery">
      <div class="themeOfTheMonthCardGalleryTrack">${slidesHtml}</div>
      ${nav}
    </div>
  `;
}

const POPOUT_EXPAND_SVG = /* svg */ `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>`;
const POPOUT_COLLAPSE_SVG = /* svg */ `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>`;

const TOTM_MARGIN_PX = 18;
const TOTM_EXPANDED_SHELL_MAX_PX = 560;
const TOTM_EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
const TOTM_MORPH_MS = 550;
const TOTM_LAYOUT_SWAP_MS = TOTM_MORPH_MS / 2;

let themeOfTheMonthAnimGen = 0;

// ---------------------------------------------------------------------------
// Dimension helpers
// ---------------------------------------------------------------------------

function themeOfTheMonthCollapsedWidth(): number {
  return Math.min(360, window.innerWidth - TOTM_MARGIN_PX * 2);
}

function themeOfTheMonthExpandedWidth(): number {
  return Math.min(520, window.innerWidth - 32);
}

function themeOfTheMonthMaxCardHeight(): number {
  return window.innerHeight - TOTM_MARGIN_PX * 2;
}

/** Fixed expanded card height — stable morph target; footer pinned inside via CSS. */
function themeOfTheMonthExpandedShellHeight(): number {
  return Math.min(TOTM_EXPANDED_SHELL_MAX_PX, themeOfTheMonthMaxCardHeight());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Pure-transform positioning
//
// The card sits at position: fixed; top: 0; left: 0 at all times.
// All movement is expressed as translate(x, y) so CSS transitions drive
// the full path — no top/left changes mid-animation that would cause snapping.
// ---------------------------------------------------------------------------

/**
 * Compute the translate values that place the card at the correct position.
 * Collapsed → bottom-right corner. Expanded → viewport centre.
 * Both states are expressed purely as transform offsets from (0, 0).
 */
function computeCardTranslate(
  cardWidth: number,
  cardHeight: number,
  expanded: boolean,
): { x: number; y: number } {
  if (expanded) {
    const x = Math.round(
      Math.max(
        TOTM_MARGIN_PX,
        Math.min(
          (window.innerWidth - cardWidth) / 2,
          window.innerWidth - TOTM_MARGIN_PX - cardWidth,
        ),
      ),
    );
    const y = Math.round(
      Math.max(
        TOTM_MARGIN_PX,
        Math.min(
          (window.innerHeight - cardHeight) / 2,
          window.innerHeight - TOTM_MARGIN_PX - cardHeight,
        ),
      ),
    );
    return { x, y };
  } else {
    const x = Math.round(
      Math.max(
        TOTM_MARGIN_PX,
        Math.min(
          window.innerWidth - cardWidth - TOTM_MARGIN_PX,
          window.innerWidth - TOTM_MARGIN_PX - cardWidth,
        ),
      ),
    );
    const y = Math.round(
      Math.max(
        TOTM_MARGIN_PX,
        window.innerHeight - cardHeight - TOTM_MARGIN_PX,
      ),
    );
    return { x, y };
  }
}

/**
 * Apply card dimensions + border-radius, then set transform so the card
 * lands at the right position.
 *
 * `targetHeight` must be passed explicitly — never read scrollHeight here,
 * because content may be hidden/shown mid-animation and scrollHeight would
 * give the wrong value, causing the snap-to-full-height bug.
 */
function applyThemeOfTheMonthCardPosition(
  card: HTMLElement,
  expanded: boolean,
  animate: boolean,
  targetHeight?: number,
): void {
  const width = expanded
    ? themeOfTheMonthExpandedWidth()
    : themeOfTheMonthCollapsedWidth();

  card.style.width = `${width}px`;
  card.style.maxHeight = expanded ? `${themeOfTheMonthMaxCardHeight()}px` : "";
  card.style.borderRadius = expanded ? "22px" : "20px";

  const h = targetHeight ?? card.offsetHeight;
  const { x, y } = computeCardTranslate(width, h, expanded);

  const canAnimate =
    animate &&
    settingsState.animations &&
    card.classList.contains("themeOfTheMonthCardMorphReady");

  if (canAnimate) {
    card.style.transition = [
      `transform ${TOTM_MORPH_MS}ms ${TOTM_EASE}`,
      `width ${TOTM_MORPH_MS}ms ${TOTM_EASE}`,
      `height ${TOTM_MORPH_MS}ms ${TOTM_EASE}`,
      `border-radius ${TOTM_MORPH_MS}ms ${TOTM_EASE}`,
    ].join(", ");
  } else {
    card.style.transition = "none";
  }

  // Force a reflow so the browser registers the pre-transition state.
  void card.offsetHeight;

  if (targetHeight !== undefined) card.style.height = `${targetHeight}px`;
  card.style.transform = `translate(${x}px, ${y}px)`;

  if (!canAnimate) {
    requestAnimationFrame(() => {
      if (card.isConnected) card.style.transition = "";
    });
  }
}

// ---------------------------------------------------------------------------
// Height helpers — keep card height explicit during animation so transforms
// can be calculated correctly.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Expand / collapse animations
// ---------------------------------------------------------------------------

function applyExpandedCardShell(card: HTMLElement): number {
  const h = themeOfTheMonthExpandedShellHeight();
  card.classList.add("themeOfTheMonthCardExpandedShell");
  card.style.height = `${h}px`;
  card.style.maxHeight = `${themeOfTheMonthMaxCardHeight()}px`;
  card.style.overflow = "hidden";
  return h;
}

function clearExpandedCardShell(card: HTMLElement): void {
  card.classList.remove("themeOfTheMonthCardExpandedShell");
  card.style.height = "";
  card.style.maxHeight = "";
  card.style.overflow = "";
}

function applyExpandedLayout(card: HTMLElement, descriptionHtml: string): void {
  const desc = card.querySelector<HTMLElement>(".themeOfTheMonthCardDescription");
  const expandedPanel = card.querySelector<HTMLElement>(".themeOfTheMonthCardExpandedPanel");

  card.classList.add("themeOfTheMonthCardExpanded", "themeOfTheMonthCardShowGallery");
  expandedPanel?.removeAttribute("hidden");
  if (expandedPanel) {
    expandedPanel.style.opacity = "";
    expandedPanel.style.transition = "";
  }
  if (desc) {
    desc.innerHTML = descriptionHtml;
    desc.classList.add("themeOfTheMonthCardDescriptionExpanded");
    desc.classList.remove("themeOfTheMonthCardDescriptionClipped");
  }
}

function applyCollapsedLayout(card: HTMLElement, descriptionHtml: string): void {
  const desc = card.querySelector<HTMLElement>(".themeOfTheMonthCardDescription");
  const expandedPanel = card.querySelector<HTMLElement>(".themeOfTheMonthCardExpandedPanel");
  const body = card.querySelector<HTMLElement>(".themeOfTheMonthCardBody");
  card.classList.remove(
    "themeOfTheMonthCardExpanded",
    "themeOfTheMonthCardShowGallery",
    "themeOfTheMonthCardExpandedShell",
  );
  clearExpandedCardShell(card);
  expandedPanel?.setAttribute("hidden", "");
  if (expandedPanel) {
    expandedPanel.style.opacity = "";
    expandedPanel.style.transition = "";
  }
  if (body) {
    body.style.opacity = "";
    body.style.transition = "";
  }
  if (desc) {
    desc.innerHTML = descriptionHtml;
    desc.classList.remove("themeOfTheMonthCardDescriptionExpanded");
    desc.classList.add("themeOfTheMonthCardDescriptionClipped");
  }
}

function clearCardInlineSizeForMeasure(card: HTMLElement): void {
  card.style.height = "";
  card.style.maxHeight = "";
  card.style.overflow = "";
}

function measureCollapsedTargetHeight(card: HTMLElement, descriptionHtml: string): number {
  applyCollapsedLayout(card, descriptionHtml);
  card.style.width = `${themeOfTheMonthCollapsedWidth()}px`;
  clearCardInlineSizeForMeasure(card);
  void card.offsetHeight;
  return Math.min(card.scrollHeight, themeOfTheMonthMaxCardHeight());
}

async function runThemeOfTheMonthExpand(
  card: HTMLElement,
  backdrop: HTMLElement | null,
  descriptionHtml: string,
): Promise<void> {
  const gen = ++themeOfTheMonthAnimGen;

  const fromH = card.offsetHeight;
  const toH = themeOfTheMonthExpandedShellHeight();

  // Morph starts in mini layout; swap to expanded layout halfway through the move.
  applyCollapsedLayout(card, descriptionHtml);
  card.style.width = `${themeOfTheMonthCollapsedWidth()}px`;

  card.classList.add("themeOfTheMonthCardExpanding");
  card.style.height = `${fromH}px`;
  card.style.overflow = "hidden";

  if (backdrop) {
    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => backdrop.classList.add("themeOfTheMonthBackdropVisible"));
  }

  applyThemeOfTheMonthCardPosition(card, true, true, toH);

  await sleep(TOTM_LAYOUT_SWAP_MS);
  if (gen !== themeOfTheMonthAnimGen) return;
  applyExpandedLayout(card, descriptionHtml);
  applyExpandedCardShell(card);

  await sleep(TOTM_LAYOUT_SWAP_MS);
  if (gen !== themeOfTheMonthAnimGen) return;

  card.classList.remove("themeOfTheMonthCardExpanding");
  card.style.transition = "";
  const finalH = themeOfTheMonthExpandedShellHeight();
  card.style.height = `${finalH}px`;
  applyThemeOfTheMonthCardPosition(card, true, false, finalH);
}

async function runThemeOfTheMonthCollapse(
  card: HTMLElement,
  backdrop: HTMLElement | null,
  descriptionHtml: string,
): Promise<void> {
  const gen = ++themeOfTheMonthAnimGen;

  const fromH = card.offsetHeight;
  const toH = measureCollapsedTargetHeight(card, descriptionHtml);

  // Restore expanded visuals, then run one morph (size + position + height together).
  applyExpandedLayout(card, descriptionHtml);
  card.style.width = `${themeOfTheMonthExpandedWidth()}px`;

  card.classList.add("themeOfTheMonthCardExpanding", "themeOfTheMonthCardCollapsing");
  card.style.height = `${fromH}px`;
  card.style.overflow = "hidden";

  if (backdrop) {
    backdrop.classList.remove("themeOfTheMonthBackdropVisible");
    backdrop.setAttribute("aria-hidden", "true");
  }

  applyThemeOfTheMonthCardPosition(card, false, true, toH);

  await sleep(TOTM_LAYOUT_SWAP_MS);
  if (gen !== themeOfTheMonthAnimGen) return;
  applyCollapsedLayout(card, descriptionHtml);

  await sleep(TOTM_LAYOUT_SWAP_MS);
  if (gen !== themeOfTheMonthAnimGen) return;

  card.classList.remove(
    "themeOfTheMonthCardExpanding",
    "themeOfTheMonthCardCollapsing",
  );
  card.style.height = `${toH}px`;
  card.style.overflow = "";
  card.style.transition = "";

  if (backdrop) backdrop.hidden = true;
}

// ---------------------------------------------------------------------------
// Instant (reduced-motion) state setter
// ---------------------------------------------------------------------------

function setThemeOfTheMonthExpandedInstant(
  card: HTMLElement,
  backdrop: HTMLElement | null,
  expanded: boolean,
  descriptionHtml: string,
): void {
  themeOfTheMonthAnimGen++;

  card.classList.toggle("themeOfTheMonthCardExpanded", expanded);
  updateThemeOfTheMonthPopoutUi(card, expanded);

  if (expanded) {
    applyExpandedLayout(card, descriptionHtml);
    if (backdrop) {
      backdrop.hidden = false;
      backdrop.setAttribute("aria-hidden", "false");
      backdrop.classList.add("themeOfTheMonthBackdropVisible");
    }
    applyExpandedCardShell(card);
  } else {
    applyCollapsedLayout(card, descriptionHtml);
    if (backdrop) {
      backdrop.classList.remove("themeOfTheMonthBackdropVisible");
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.hidden = true;
    }
  }

  applyThemeOfTheMonthCardPosition(
    card,
    expanded,
    false,
    expanded ? themeOfTheMonthExpandedShellHeight() : undefined,
  );
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function updateThemeOfTheMonthPopoutUi(card: HTMLElement, expanded: boolean): void {
  const popout = card.querySelector<HTMLButtonElement>(".themeOfTheMonthCardPopout");
  const popoutIcon = popout?.querySelector(".themeOfTheMonthCardPopoutIcon");
  if (popoutIcon) {
    popoutIcon.innerHTML = expanded ? POPOUT_COLLAPSE_SVG : POPOUT_EXPAND_SVG;
  }
  if (popout) {
    popout.setAttribute("aria-label", expanded ? "Collapse" : "Expand");
    popout.title = expanded ? "Collapse" : "Expand";
  }
}

function closeThemeOfTheMonthCard(card: HTMLElement, onDismissed?: () => void): void {
  if (card.classList.contains("themeOfTheMonthCardClosing")) return;
  card.classList.add("themeOfTheMonthCardClosing");
  window.setTimeout(() => {
    card.remove();
    onDismissed?.();
  }, 180);
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

function initThemeOfTheMonthGallery(card: HTMLElement): void {
  const track = card.querySelector<HTMLElement>(".themeOfTheMonthCardGalleryTrack");
  if (!track) return;

  const slides = [...track.querySelectorAll<HTMLElement>(".themeOfTheMonthCardGallerySlide")];
  if (slides.length <= 1) return;

  const dots = [...card.querySelectorAll<HTMLButtonElement>(".themeOfTheMonthCardGalleryDot")];
  let activeIndex = 0;

  const scrollToIndex = (index: number) => {
    const clamped = ((index % slides.length) + slides.length) % slides.length;
    activeIndex = clamped;
    const slide = slides[clamped];
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    for (const dot of dots) {
      const isActive = Number(dot.dataset.slide) === clamped;
      dot.classList.toggle("themeOfTheMonthCardGalleryDotActive", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  };

  card.querySelector(".themeOfTheMonthCardGalleryPrev")?.addEventListener("click", (e) => {
    e.stopPropagation();
    scrollToIndex(activeIndex - 1);
  });
  card.querySelector(".themeOfTheMonthCardGalleryNext")?.addEventListener("click", (e) => {
    e.stopPropagation();
    scrollToIndex(activeIndex + 1);
  });
  for (const dot of dots) {
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      scrollToIndex(Number((e.currentTarget as HTMLButtonElement).dataset.slide));
    });
  }

  const syncDotsFromScroll = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let nearestDist = Infinity;
    slides.forEach((slide, i) => {
      const center = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(center - mid);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    if (nearest === activeIndex) return;
    activeIndex = nearest;
    for (const dot of dots) {
      const isActive = Number(dot.dataset.slide) === nearest;
      dot.classList.toggle("themeOfTheMonthCardGalleryDotActive", isActive);
      dot.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  };

  track.addEventListener("scroll", syncDotsFromScroll, { passive: true });
}

function attachPopupImages(root: ParentNode): void {
  for (const img of root.querySelectorAll<HTMLImageElement>("img")) {
    attachPopupMediaFullscreen(img);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function OpenThemeOfTheMonthPopup(
  entry: ThemeOfTheMonthEntry,
  onDismissed?: () => void,
): Promise<void> {
  document.getElementById("theme-of-the-month-card")?.remove();
  document.getElementById("theme-of-the-month-backdrop")?.remove();

  const monthLabel = formatMonthLabel(entry.month);
  const linkedThemeId = entry.theme_id ?? entry.theme?.id;
  const storeTheme = linkedThemeId ? await fetchThemeStoreTheme(linkedThemeId) : null;
  const heroUrl =
    (storeTheme ? heroUrlFromStoreTheme(storeTheme) : null) ??
    entry.cover_image?.trim() ??
    null;
  const gallerySlides = buildPopupGallerySlides(entry, storeTheme, heroUrl);
  const hasExpandableContent = gallerySlides.length > 0 || entry.description.trim().length > 0;

  const descriptionHtml = escapeHTML(entry.description).replace(/\n/g, "<br />");
  const heroEmbossHtml =
    heroUrl && storeTheme ? renderHeroEmbossHtml(storeTheme, entry) : "";

  const backdrop = stringToHTML(/* html */ `
    <div id="theme-of-the-month-backdrop" class="themeOfTheMonthBackdrop" hidden aria-hidden="true"></div>
  `).firstChild as HTMLElement;

  const card = stringToHTML(/* html */ `
    <aside id="theme-of-the-month-card" class="themeOfTheMonthCard${settingsState.animations ? "" : " themeOfTheMonthCardReducedMotion"}" role="dialog" aria-label="Theme of the Month">
      <div class="themeOfTheMonthCardMedia">
        <button type="button" class="themeOfTheMonthCardPopout" aria-label="Expand" title="Expand"${hasExpandableContent ? "" : " hidden"}>
          <span class="themeOfTheMonthCardPopoutIcon">${POPOUT_EXPAND_SVG}</span>
        </button>
        <div class="themeOfTheMonthCardCompactMedia"${heroUrl ? "" : " hidden"}>
          ${heroUrl ? `<img class="themeOfTheMonthCardImage" src="${escapeHTML(heroUrl)}" alt="${escapeHTML(entry.title)}" />` : ""}
        </div>
        <div class="themeOfTheMonthCardExpandedPanel" hidden>
          ${renderGallerySlidesHtml(gallerySlides)}
        </div>
        ${heroEmbossHtml}
      </div>
      <div class="themeOfTheMonthCardBody">
        <p class="themeOfTheMonthCardEyebrow">Theme of the Month · ${escapeHTML(monthLabel)}</p>
        <h2>${escapeHTML(entry.title)}</h2>
        <p class="themeOfTheMonthCardDescription themeOfTheMonthCardDescriptionClipped">${descriptionHtml}</p>
        <div class="themeOfTheMonthCardActions">
          <div class="themeOfTheMonthCardActionsStart">
            ${linkedThemeId ? `<button type="button" class="themeOfTheMonthCardPrimary">Open Store</button>` : ""}
          </div>
          <div class="themeOfTheMonthCardActionsEnd">
            <button type="button" class="themeOfTheMonthCardSecondary">Close</button>
            <button type="button" class="themeOfTheMonthCardDontShow">Don't show again</button>
          </div>
        </div>
      </div>
      <div class="themeOfTheMonthCardConfirm" hidden>
        <div class="themeOfTheMonthCardConfirmInner">
          <h3>Don't show again?</h3>
          <p>Theme of the Month popups will be turned off. You can turn them back on in BetterSEQTA+ settings.</p>
          <div class="themeOfTheMonthCardConfirmActions">
            <button type="button" class="themeOfTheMonthCardConfirmCancel">Cancel</button>
            <button type="button" class="themeOfTheMonthCardConfirmAccept">Don't show again</button>
          </div>
        </div>
      </div>
    </aside>
  `).firstChild as HTMLElement;

  let isExpanded = false;
  let expandAnimating = false;

  const applyExpandedState = async (expanded: boolean): Promise<void> => {
    updateThemeOfTheMonthPopoutUi(card, expanded);
    if (!settingsState.animations) {
      setThemeOfTheMonthExpandedInstant(card, backdrop, expanded, descriptionHtml);
      return;
    }
    expandAnimating = true;
    try {
      if (expanded) {
        await runThemeOfTheMonthExpand(card, backdrop, descriptionHtml);
      } else {
        await runThemeOfTheMonthCollapse(card, backdrop, descriptionHtml);
      }
    } finally {
      expandAnimating = false;
      updateThemeOfTheMonthPopoutUi(card, expanded);
    }
  };

  const onDocKey = (ev: KeyboardEvent) => {
    if (ev.key !== "Escape") return;
    if (!isExpanded || expandAnimating) return;
    ev.stopPropagation();
    isExpanded = false;
    void applyExpandedState(false);
  };

  let autoCloseTimeout = 0;
  const pauseAutoClose = () => window.clearTimeout(autoCloseTimeout);
  const onResize = () => {
    if (isExpanded) applyExpandedCardShell(card);
    applyThemeOfTheMonthCardPosition(
      card,
      isExpanded,
      false,
      isExpanded ? themeOfTheMonthExpandedShellHeight() : undefined,
    );
  };

  const dismissWithCleanup = () => {
    pauseAutoClose();
    window.removeEventListener("resize", onResize);
    backdrop.remove();
    document.removeEventListener("keydown", onDocKey, true);
    closeThemeOfTheMonthCard(card, onDismissed);
  };

  autoCloseTimeout = window.setTimeout(dismissWithCleanup, 30_000);
  card.addEventListener("mouseenter", pauseAutoClose, { once: true });

  initThemeOfTheMonthGallery(card);
  attachPopupImages(card);

  const confirmEl = card.querySelector<HTMLElement>(".themeOfTheMonthCardConfirm");

  const toggleExpanded = () => {
    if (expandAnimating) return;
    isExpanded = !isExpanded;
    pauseAutoClose();
    void applyExpandedState(isExpanded);
  };

  card.querySelector(".themeOfTheMonthCardPopout")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleExpanded();
  });

  backdrop.addEventListener("click", () => {
    if (!isExpanded || expandAnimating) return;
    isExpanded = false;
    void applyExpandedState(false);
  });

  document.addEventListener("keydown", onDocKey, true);

  card.querySelector(".themeOfTheMonthCardSecondary")?.addEventListener("click", () => {
    settingsState.themeOfTheMonthDismissedMonth = entry.month;
    dismissWithCleanup();
  });

  card.querySelector(".themeOfTheMonthCardPrimary")?.addEventListener("click", () => {
    settingsState.themeOfTheMonthDismissedMonth = entry.month;
    dismissWithCleanup();
    openThemeStoreWithHighlight(linkedThemeId!);
  });

  const openDontShowConfirm = () => {
    pauseAutoClose();
    if (!confirmEl) return;
    confirmEl.hidden = false;
    requestAnimationFrame(() => confirmEl.classList.add("themeOfTheMonthCardConfirmVisible"));
  };

  card.querySelector(".themeOfTheMonthCardDontShow")?.addEventListener("click", openDontShowConfirm);

  card.querySelector(".themeOfTheMonthCardConfirmCancel")?.addEventListener("click", () => {
    if (!confirmEl) return;
    confirmEl.classList.remove("themeOfTheMonthCardConfirmVisible");
    window.setTimeout(() => { confirmEl.hidden = true; }, 160);
  });

  card.querySelector(".themeOfTheMonthCardConfirmAccept")?.addEventListener("click", () => {
    settingsState.themeOfTheMonthDisabled = true;
    dismissWithCleanup();
  });

  // Mount — card at top:0; left:0, all positioning via transform.
  card.style.position = "fixed";
  card.style.top = "0";
  card.style.left = "0";

  document.body.append(backdrop, card);

  // Set initial collapsed position instantly (no transition).
  applyThemeOfTheMonthCardPosition(card, false, false);

  window.addEventListener("resize", onResize);

  // Enable morph-ready class after two frames so the initial snap doesn't
  // accidentally play a transition.
  if (settingsState.animations) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add("themeOfTheMonthCardMorphReady");
      });
    });
  }
}

export async function showThemeOfTheMonthPopupNow(): Promise<void> {
  const entry = await fetchThemeOfTheMonth();
  if (!entry) {
    alert(
      "No Theme of the Month entry for the current month (UTC). Create one in the website admin, or check your dev API base URL.",
    );
    return;
  }

  settingsState.themeOfTheMonthDismissedMonth = undefined;

  if (document.getElementById("whatsnewbk")) {
    await closePopup();
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  await OpenThemeOfTheMonthPopup(entry);
}