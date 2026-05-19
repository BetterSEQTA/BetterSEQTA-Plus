import browser from "webextension-polyfill";
import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { closePopup, openPopup } from "./PopupManager";
import { getApiBase } from "../DevApiBase";
import { openThemeStoreWithHighlight } from "../openThemeStoreWithHighlight";
import { cloudAuth } from "../CloudAuth";

/**
 * Server response shape from `/api/theme-of-the-month/current`.
 * Hero image is resolved client-side via the theme store API when `theme_id` is set.
 */
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

/**
 * Fetches the current month's Theme of the Month entry from the API.
 * Returns `null` when no entry is configured for this month, or when the
 * request fails (we never want a network problem to block other startup
 * popups).
 */
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

/** True when we have a new monthly entry the user hasn't dismissed yet. */
export function shouldShowThemeOfTheMonth(entry: ThemeOfTheMonthEntry | null): boolean {
  if (!entry) return false;
  return settingsState.themeOfTheMonthLastSeenId !== entry.id;
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

/** Same priority as the theme store: marquee, then cover/banner. */
function heroUrlFromStoreTheme(theme: {
  marqueeImage?: string | null;
  coverImage?: string | null;
}): string | null {
  const url = (theme.marqueeImage || theme.coverImage || "").trim();
  return url || null;
}

/**
 * Loads hero image for a store theme via the background script (same path as
 * {@link ThemeSelector} / theme store detail fetches).
 */
export async function fetchThemeStoreHeroImage(themeId: string): Promise<string | null> {
  try {
    const token = await cloudAuth.getStoredToken();
    const res = (await browser.runtime.sendMessage({
      type: "fetchThemeDetails",
      themeId,
      token: token ?? undefined,
    })) as { success?: boolean; data?: { theme?: { marqueeImage?: string; coverImage?: string } } };

    if (!res?.success || !res?.data?.theme) return null;
    return heroUrlFromStoreTheme(res.data.theme);
  } catch (err) {
    console.warn("[ThemeOfTheMonth] Failed to fetch theme store image:", err);
    return null;
  }
}

/** Linked theme store image, else optional admin-uploaded cover. */
async function resolvePopupHeroImageUrl(entry: ThemeOfTheMonthEntry): Promise<string | null> {
  const themeId = entry.theme_id ?? entry.theme?.id;
  if (themeId) {
    const fromStore = await fetchThemeStoreHeroImage(themeId);
    if (fromStore) return fromStore;
  }
  const fallback = entry.cover_image?.trim();
  return fallback || null;
}

function createHeroImageContainer(imageUrl: string, alt: string): HTMLElement {
  const container = document.createElement("div");
  container.classList.add("whatsnewImgContainer");

  const img = document.createElement("img");
  img.src = imageUrl;
  img.alt = alt;
  img.classList.add("whatsnewImg");
  container.appendChild(img);

  return container;
}

/**
 * Renders the Theme of the Month announcement popup.
 */
export async function OpenThemeOfTheMonthPopup(
  entry: ThemeOfTheMonthEntry,
  onDismissed?: () => void,
) {
  if (document.getElementById("whatsnewbk")) {
    onDismissed?.();
    return;
  }

  const monthLabel = formatMonthLabel(entry.month);

  const header = stringToHTML(
    /* html */ `
    <div class="whatsnewHeader themeOfTheMonthHeader">
      <h1>${escapeHTML(entry.title)}</h1>
      <p class="themeOfTheMonthSubtitle">Theme of the Month · ${escapeHTML(monthLabel)}</p>
    </div>`,
  ).firstChild as HTMLElement;

  const heroUrl = await resolvePopupHeroImageUrl(entry);
  const imageContainer = heroUrl ? createHeroImageContainer(heroUrl, entry.title) : null;

  const descriptionHTML = escapeHTML(entry.description).replace(/\n/g, "<br />");
  const text = stringToHTML(/* html */ `
    <div class="whatsnewTextContainer themeOfTheMonthDescription" style="height: 50%; overflow-y: auto; font-size: 1.2rem; line-height: 1.6;">
      <p>${descriptionHTML}</p>
    </div>
  `).firstChild as HTMLElement;

  let footer: HTMLElement | null = null;
  const linkedThemeId = entry.theme_id ?? entry.theme?.id;
  const linkedThemeName = entry.theme?.name;
  if (linkedThemeId && linkedThemeName) {
    footer = document.createElement("div");
    footer.classList.add("whatsnewFooter", "themeOfTheMonthFooter");

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.classList.add("themeOfTheMonthViewButton");
    viewBtn.textContent = `View "${linkedThemeName}" in the Theme Store`;
    viewBtn.addEventListener("click", () => {
      void closePopup();
      openThemeStoreWithHighlight(linkedThemeId);
    });

    footer.appendChild(viewBtn);
  }

  settingsState.themeOfTheMonthLastSeenId = entry.id;

  const content: (Node | null)[] = [];
  if (imageContainer) content.push(imageContainer);
  content.push(text);
  if (footer) content.push(footer);

  openPopup({
    header,
    content,
    afterClose: onDismissed,
  });
}

/**
 * Dev helper: fetch the current month's entry and show the popup immediately,
 * even if the user has already dismissed it this month.
 */
export async function showThemeOfTheMonthPopupNow(): Promise<void> {
  const entry = await fetchThemeOfTheMonth();
  if (!entry) {
    alert(
      "No Theme of the Month entry for the current month (UTC). Create one in the website admin, or check your dev API base URL.",
    );
    return;
  }

  settingsState.themeOfTheMonthLastSeenId = undefined;

  if (document.getElementById("whatsnewbk")) {
    await closePopup();
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  await OpenThemeOfTheMonthPopup(entry);
}
