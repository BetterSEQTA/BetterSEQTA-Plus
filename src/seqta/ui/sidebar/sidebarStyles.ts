import { settingsState } from "@/seqta/utils/listeners/SettingsState";
import { isPerformanceMode } from "@/seqta/utils/performanceMode";

export type SidebarStyleId =
  | "classic"
  | "soft"
  | "pill"
  | "glass"
  | "sharp"
  | "strip"
  | "neon";

export type SidebarDensity = "compact" | "comfortable" | "large";
export type SidebarActiveIndicator = "fill" | "bar" | "outline" | "underline";
export type SidebarWidth = "narrow" | "default" | "wide";

export type SidebarStyleDef = {
  id: SidebarStyleId;
  label: string;
  description: string;
};

export const SIDEBAR_STYLES: readonly SidebarStyleDef[] = [
  { id: "classic", label: "Classic", description: "Default BetterSEQTA look" },
  { id: "soft", label: "Soft", description: "Roomier spacing with gentle shadows" },
  { id: "pill", label: "Pill", description: "Fully rounded capsule items" },
  { id: "glass", label: "Glass", description: "Frosted translucent rows" },
  { id: "sharp", label: "Sharp", description: "Compact, squared edges" },
  { id: "strip", label: "Strip", description: "Flat rows with a strong active accent" },
  { id: "neon", label: "Neon", description: "Glowing active highlight" },
] as const;

const STYLE_IDS = SIDEBAR_STYLES.map((s) => s.id);

/** Defaults match the current custom sidebar (no visual change). */
export const DEFAULT_SIDEBAR_STYLE: SidebarStyleId = "classic";
export const DEFAULT_SIDEBAR_DENSITY: SidebarDensity = "comfortable";
export const DEFAULT_SIDEBAR_INDICATOR: SidebarActiveIndicator = "fill";
export const DEFAULT_SIDEBAR_WIDTH: SidebarWidth = "default";
export const DEFAULT_SIDEBAR_RADIUS = 12;
export const DEFAULT_SIDEBAR_BLUR = 50;

export const SIDEBAR_WIDTH_PX = {
  narrow: 220,
  default: 270,
  wide: 320,
} as const;

export const STYLE_CLASS_PREFIX = "bsplus-sidebar-style-";
export const DENSITY_CLASS_PREFIX = "bsplus-sidebar-density-";
export const INDICATOR_CLASS_PREFIX = "bsplus-sidebar-indicator-";

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export const normalizeSidebarStyleId = (v: unknown) =>
  oneOf(v, STYLE_IDS, DEFAULT_SIDEBAR_STYLE);

export const normalizeSidebarDensity = (v: unknown) =>
  oneOf(v, ["compact", "comfortable", "large"] as const, DEFAULT_SIDEBAR_DENSITY);

export const normalizeSidebarIndicator = (v: unknown) =>
  oneOf(
    v,
    ["fill", "bar", "outline", "underline"] as const,
    DEFAULT_SIDEBAR_INDICATOR,
  );

export const normalizeSidebarWidth = (v: unknown) =>
  oneOf(v, ["narrow", "default", "wide"] as const, DEFAULT_SIDEBAR_WIDTH);

export const normalizeSidebarRadius = (v: unknown) =>
  clampInt(v, 0, 24, DEFAULT_SIDEBAR_RADIUS);

export const normalizeSidebarBlur = (v: unknown) =>
  clampInt(v, 0, 80, DEFAULT_SIDEBAR_BLUR);

export function getSidebarStyle(id: unknown): SidebarStyleDef {
  const normalized = normalizeSidebarStyleId(id);
  return SIDEBAR_STYLES.find((s) => s.id === normalized) ?? SIDEBAR_STYLES[0];
}

function clearPrefixed(el: HTMLElement, prefix: string) {
  for (const cls of [...el.classList]) {
    if (cls.startsWith(prefix)) el.classList.remove(cls);
  }
}

function setExclusiveClass(
  el: HTMLElement,
  prefix: string,
  value: string,
  skipDefault?: string,
) {
  clearPrefixed(el, prefix);
  if (value !== skipDefault) el.classList.add(`${prefix}${value}`);
}

/** Apply style preset class on `#menu` (classic = no class). */
export function applySidebarStyleClass(
  menu: HTMLElement | null | undefined,
  styleId: unknown,
) {
  if (!menu) return;
  setExclusiveClass(
    menu,
    STYLE_CLASS_PREFIX,
    normalizeSidebarStyleId(styleId),
    DEFAULT_SIDEBAR_STYLE,
  );
}

/** Safe to call with no menu (still sets width/blur/radius on `:root`). */
let lastSidebarLookKey = "";

export function applySidebarLook(
  menu: HTMLElement | null | undefined = document.getElementById("menu"),
) {
  const density = normalizeSidebarDensity(settingsState.sidebarDensity);
  const indicator = normalizeSidebarIndicator(settingsState.sidebarActiveIndicator);
  const width = normalizeSidebarWidth(settingsState.sidebarWidth);
  const radius = normalizeSidebarRadius(settingsState.sidebarCornerRadius);
  const blur = isPerformanceMode()
    ? 0
    : normalizeSidebarBlur(settingsState.sidebarBlur);

  const lookKey = `${density}|${indicator}|${width}|${radius}|${blur}`;
  if (lookKey === lastSidebarLookKey) return;
  lastSidebarLookKey = lookKey;

  const root = document.documentElement;
  root.style.setProperty("--bsplus-sidebar-width", `${SIDEBAR_WIDTH_PX[width]}px`);
  root.style.setProperty("--bsplus-sidebar-radius", `${radius}px`);
  root.style.setProperty("--bsplus-sidebar-blur", `${blur}px`);

  if (!menu) return;
  setExclusiveClass(menu, DENSITY_CLASS_PREFIX, density, DEFAULT_SIDEBAR_DENSITY);
  setExclusiveClass(
    menu,
    INDICATOR_CLASS_PREFIX,
    indicator,
    DEFAULT_SIDEBAR_INDICATOR,
  );
}

export function clearSidebarAppearance(menu: HTMLElement | null | undefined) {
  const root = document.documentElement;
  root.style.removeProperty("--bsplus-sidebar-width");
  root.style.removeProperty("--bsplus-sidebar-radius");
  root.style.removeProperty("--bsplus-sidebar-blur");
  if (!menu) return;
  clearPrefixed(menu, STYLE_CLASS_PREFIX);
  clearPrefixed(menu, DENSITY_CLASS_PREFIX);
  clearPrefixed(menu, INDICATOR_CLASS_PREFIX);
}
