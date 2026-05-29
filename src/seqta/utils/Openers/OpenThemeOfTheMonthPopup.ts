import browser from "webextension-polyfill";
import stringToHTML from "../stringToHTML";
import { settingsState } from "../listeners/SettingsState";
import { closePopup } from "./PopupManager";
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

/** True when the current month's entry should appear in the startup queue. */
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

function closeThemeOfTheMonthCard(card: HTMLElement, onDismissed?: () => void) {
  if (card.classList.contains("themeOfTheMonthCardClosing")) return;

  card.classList.add("themeOfTheMonthCardClosing");
  window.setTimeout(() => {
    card.remove();
    onDismissed?.();
  }, 180);
}

/**
 * Renders the Theme of the Month announcement card.
 */
export async function OpenThemeOfTheMonthPopup(
  entry: ThemeOfTheMonthEntry,
  onDismissed?: () => void,
) {
  document.getElementById("theme-of-the-month-card")?.remove();

  const monthLabel = formatMonthLabel(entry.month);
  const heroUrl = await resolvePopupHeroImageUrl(entry);
  const description = escapeHTML(entry.description).replace(/\n/g, " ");
  const linkedThemeId = entry.theme_id ?? entry.theme?.id;

  const card = stringToHTML(/* html */ `
    <aside id="theme-of-the-month-card" class="themeOfTheMonthCard" role="dialog" aria-label="Theme of the Month">
      <button type="button" class="themeOfTheMonthCardDisable" aria-label="Don't show Theme of the Month again" title="Don't show again">×</button>
      ${
        heroUrl
          ? `<img class="themeOfTheMonthCardImage" src="${escapeHTML(heroUrl)}" alt="${escapeHTML(entry.title)}" />`
          : ""
      }
      <div class="themeOfTheMonthCardBody">
        <p class="themeOfTheMonthCardEyebrow">Theme of the Month · ${escapeHTML(monthLabel)}</p>
        <h2>${escapeHTML(entry.title)}</h2>
        <p class="themeOfTheMonthCardDescription">${description}</p>
        <div class="themeOfTheMonthCardActions">
          ${
            linkedThemeId
              ? `<button type="button" class="themeOfTheMonthCardPrimary">Open Store</button>`
              : ""
          }
          <button type="button" class="themeOfTheMonthCardSecondary">Close</button>
        </div>
      </div>
      <div class="themeOfTheMonthCardConfirm" hidden>
        <div class="themeOfTheMonthCardConfirmInner">
          <h3>Don't show again?</h3>
          <p>You won't see this month's announcement again until next month. Re-enable monthly popups in BetterSEQTA+ settings.</p>
          <div class="themeOfTheMonthCardConfirmActions">
            <button type="button" class="themeOfTheMonthCardConfirmCancel">Cancel</button>
            <button type="button" class="themeOfTheMonthCardConfirmAccept">Don't show again</button>
          </div>
        </div>
      </div>
    </aside>
  `).firstChild as HTMLElement;

  const autoCloseTimeout = window.setTimeout(() => {
    closeThemeOfTheMonthCard(card, onDismissed);
  }, 12000);

  const dismiss = () => {
    window.clearTimeout(autoCloseTimeout);
    closeThemeOfTheMonthCard(card, onDismissed);
  };

  card.addEventListener("mouseenter", () => window.clearTimeout(autoCloseTimeout), { once: true });

  const confirmEl = card.querySelector<HTMLElement>(".themeOfTheMonthCardConfirm");

  card.querySelector(".themeOfTheMonthCardSecondary")?.addEventListener("click", () => {
    dismiss();
  });

  card.querySelector(".themeOfTheMonthCardPrimary")?.addEventListener("click", () => {
    dismiss();
    openThemeStoreWithHighlight(linkedThemeId!);
  });

  card.querySelector(".themeOfTheMonthCardDisable")?.addEventListener("click", () => {
    window.clearTimeout(autoCloseTimeout);
    if (confirmEl) {
      confirmEl.hidden = false;
      // allow CSS transition by toggling on next frame
      requestAnimationFrame(() => confirmEl.classList.add("themeOfTheMonthCardConfirmVisible"));
    }
  });

  card.querySelector(".themeOfTheMonthCardConfirmCancel")?.addEventListener("click", () => {
    if (!confirmEl) return;
    confirmEl.classList.remove("themeOfTheMonthCardConfirmVisible");
    window.setTimeout(() => {
      confirmEl.hidden = true;
    }, 160);
  });

  card.querySelector(".themeOfTheMonthCardConfirmAccept")?.addEventListener("click", () => {
    settingsState.themeOfTheMonthDismissedMonth = entry.month;
    dismiss();
  });

  document.body.appendChild(card);
}

/**
 * Dev helper: fetch the current month's entry and show the popup immediately,
 * even if the user dismissed it for this calendar month.
 */
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
