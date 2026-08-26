import type { CustomTheme } from '@/types/CustomThemes';
import type { Theme } from '@/interface/types/Theme';

export type ThemeListMode = 'downloaded' | 'custom' | 'all';

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
