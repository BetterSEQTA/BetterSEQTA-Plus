import type { CustomTheme } from '@/types/CustomThemes';
import type { Theme } from '@/interface/types/Theme';
import {
  filterThemesByMode,
  getThemeApplyButtonStyles,
  getCommunityInstalledThemeIds,
  getStoreInstalledThemeIds,
  isStoreThemeInstalled,
  resolveLocalThemeInstallId,
  resolveStoreVariantAccentColor,
} from './themeListFilters';

function makeCustomTheme(overrides: Partial<CustomTheme> & Pick<CustomTheme, 'id' | 'name'>): CustomTheme {
  return {
    description: '',
    defaultColour: '#000000',
    CanChangeColour: true,
    allowBackgrounds: true,
    CustomCSS: '',
    CustomImages: [],
    coverImage: null,
    isEditable: false,
    hideThemeName: false,
    ...overrides,
  };
}

function makeStoreTheme(overrides: Partial<Theme> & Pick<Theme, 'id' | 'name'>): Theme {
  return {
    description: '',
    coverImage: '',
    ...overrides,
  };
}

describe('resolveLocalThemeInstallId', () => {
  it('keeps store ids and forks local imports that collide with store copies', () => {
    expect(resolveLocalThemeInstallId('theme-1', null, true, false)).toBe('theme-1');
    const forked = resolveLocalThemeInstallId(
      'theme-1',
      makeCustomTheme({ id: 'theme-1', name: 'Store', installedFromStore: true }),
      false,
      false,
    );
    expect(forked).not.toBe('theme-1');
    expect(
      resolveLocalThemeInstallId(
        'theme-1',
        makeCustomTheme({ id: 'theme-1', name: 'Local' }),
        false,
        false,
      ),
    ).toBe('theme-1');
  });
});

describe('filterThemesByMode', () => {
  const storeTheme = makeCustomTheme({
    id: 'store-1',
    name: 'Store Theme',
    installedFromStore: true,
  });
  const communityTheme = makeCustomTheme({
    id: 'community-1',
    name: 'Community Theme',
    installedFromCommunity: true,
  });
  const localTheme = makeCustomTheme({ id: 'local-1', name: 'Local Theme' });

  it('splits store, community, and local themes by mode', () => {
    const all = [storeTheme, communityTheme, localTheme];
    expect(filterThemesByMode(all, 'all')).toEqual(all);
    expect(filterThemesByMode(all, 'downloaded')).toEqual([storeTheme, communityTheme]);
    expect(filterThemesByMode(all, 'custom')).toEqual([localTheme]);
  });
});

describe('installed theme id helpers', () => {
  it('returns store-only and community-only ids', () => {
    const themes = [
      makeCustomTheme({ id: 'store-1', name: 'Store', installedFromStore: true }),
      makeCustomTheme({ id: 'community-1', name: 'Community', installedFromCommunity: true }),
      makeCustomTheme({ id: 'local-1', name: 'Local' }),
    ];
    expect(getStoreInstalledThemeIds(themes)).toEqual(['store-1']);
    expect(getCommunityInstalledThemeIds(themes)).toEqual(['community-1']);
  });
});

describe('isStoreThemeInstalled', () => {
  it('matches master or flavour ids', () => {
    const theme = makeStoreTheme({
      id: 'master-1',
      name: 'Master',
      flavours: [{ id: 'flavour-1', name: 'Dark', accent_color: '#000', cover_image: '' }],
    });
    expect(isStoreThemeInstalled(theme, ['master-1'])).toBe(true);
    expect(isStoreThemeInstalled(theme, ['flavour-1'])).toBe(true);
    expect(isStoreThemeInstalled(theme, ['other'])).toBe(false);
  });
});

describe('resolveStoreVariantAccentColor', () => {
  it('prefers installed colours then flavour accents', () => {
    const theme = makeStoreTheme({
      id: 'master-1',
      name: 'Master',
      flavours: [{ id: 'flavour-1', name: 'Dark', accent_color: '#112233', cover_image: '' }],
    });
    expect(resolveStoreVariantAccentColor(theme, 'flavour-1', { 'flavour-1': '#ff0000' })).toBe(
      '#ff0000',
    );
    expect(resolveStoreVariantAccentColor(theme, 'flavour-1')).toBe('#112233');
  });
});

describe('getThemeApplyButtonStyles', () => {
  it('derives apply and applied styles from the accent colour', () => {
    const styles = getThemeApplyButtonStyles('#ff0000');
    expect(styles.apply).toContain('background-color: #FF0000');
    expect(styles.applied).toContain('color: #FF0000');
  });
});
