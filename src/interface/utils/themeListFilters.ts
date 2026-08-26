import type { CustomTheme } from '@/types/CustomThemes';
import type { Theme } from '@/interface/types/Theme';
import { parseCssColor } from '@/seqta/ui/colors/parseCssColor';

export type ThemeListMode = 'downloaded' | 'custom' | 'all';

const DEFAULT_THEME_ACCENT = 'rgba(0, 123, 255, 1)';

export function filterThemesByMode(themes: CustomTheme[], mode: ThemeListMode): CustomTheme[] {
  if (mode === 'all') return themes;
  if (mode === 'custom') return themes.filter((theme) => theme.isEditable === true);
  return themes.filter((theme) => theme.isEditable !== true);
}

export function isStoreThemeInstalled(theme: Theme, installedIds: string[]): boolean {
  const installed = new Set(installedIds);
  if (installed.has(theme.id)) return true;
  return (theme.flavours ?? []).some((flavour) => installed.has(flavour.id));
}

export function resolveStoreVariantAccentColor(
  theme: Theme,
  variantId: string,
  installedThemeColors: Record<string, string> = {},
): string {
  const installed = installedThemeColors[variantId]?.trim();
  if (installed) return installed;

  const flavour = theme.flavours?.find((entry) => entry.id === variantId);
  if (flavour?.accent_color?.trim()) return flavour.accent_color.trim();

  if (variantId === theme.id) {
    const firstFlavourAccent = theme.flavours?.find((entry) => entry.accent_color?.trim())?.accent_color?.trim();
    if (firstFlavourAccent) return firstFlavourAccent;
  }

  return DEFAULT_THEME_ACCENT;
}

export type ThemeApplyButtonStyles = {
  apply: string;
  applied: string;
};

export function getThemeApplyButtonStyles(accentColor: string | undefined): ThemeApplyButtonStyles {
  const parsed = parseCssColor(accentColor?.trim() || DEFAULT_THEME_ACCENT, DEFAULT_THEME_ACCENT);
  const onAccent = parsed.lightness() >= 60 ? '#18181b' : '#ffffff';

  return {
    apply: `background-color: ${parsed.hex()}; color: ${onAccent};`,
    applied: `background-color: ${parsed.alpha(0.18).string()}; color: ${parsed.hex()};`,
  };
}
