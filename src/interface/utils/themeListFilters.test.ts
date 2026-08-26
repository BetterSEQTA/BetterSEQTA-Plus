import type { CustomTheme } from '@/types/CustomThemes';
import type { Theme } from '@/interface/types/Theme';
import {
  filterThemesByMode,
  getThemeApplyButtonStyles,
  getCommunityInstalledThemeIds,
  getStoreInstalledThemeIds,
  isDownloadedTheme,
  isLocalCustomTheme,
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

describe('isLocalCustomTheme', () => {
  it('returns true for file imports and theme creator saves', () => {
    expect(isLocalCustomTheme(makeCustomTheme({ id: 'a', name: 'A' }))).toBe(true);
    expect(
      isLocalCustomTheme(
        makeCustomTheme({ id: 'b', name: 'B', installedFromStore: false }),
      ),
    ).toBe(true);
  });

  it('returns false for store and community installs', () => {
    expect(
      isLocalCustomTheme(
        makeCustomTheme({ id: 's', name: 'S', installedFromStore: true }),
      ),
    ).toBe(false);
    expect(
      isLocalCustomTheme(
        makeCustomTheme({ id: 'c', name: 'C', installedFromCommunity: true }),
      ),
    ).toBe(false);
  });
});

describe('resolveLocalThemeInstallId', () => {
  it('keeps the id for store installs', () => {
    expect(resolveLocalThemeInstallId('theme-1', null, true, false)).toBe('theme-1');
  });

  it('generates a new id when a local import collides with a store copy', () => {
    const nextId = resolveLocalThemeInstallId(
      'theme-1',
      makeCustomTheme({ id: 'theme-1', name: 'Store', installedFromStore: true }),
      false,
      false,
    );
    expect(nextId).not.toBe('theme-1');
  });

  it('keeps the id when replacing an existing local copy', () => {
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
  const fileImport = makeCustomTheme({
    id: 'file-1',
    name: 'Imported Theme',
    installedFromStore: false,
    isEditable: false,
  });

  it('returns all themes in all mode', () => {
    expect(filterThemesByMode([storeTheme, localTheme], 'all')).toEqual([storeTheme, localTheme]);
  });

  it('returns store and community themes in downloaded mode', () => {
    expect(
      filterThemesByMode([storeTheme, communityTheme, localTheme, fileImport], 'downloaded'),
    ).toEqual([storeTheme, communityTheme]);
  });

  it('returns local/file themes in custom mode', () => {
    expect(
      filterThemesByMode([storeTheme, communityTheme, localTheme, fileImport], 'custom'),
    ).toEqual([localTheme, fileImport]);
  });

  it('isDownloadedTheme is the inverse of isLocalCustomTheme for known sources', () => {
    expect(isDownloadedTheme(storeTheme)).toBe(true);
    expect(isLocalCustomTheme(storeTheme)).toBe(false);
    expect(isDownloadedTheme(localTheme)).toBe(false);
    expect(isLocalCustomTheme(localTheme)).toBe(true);
  });
});

describe('getStoreInstalledThemeIds', () => {
  it('returns only store-installed theme ids', () => {
    const themes = [
      makeCustomTheme({ id: 'store-1', name: 'Store', installedFromStore: true }),
      makeCustomTheme({ id: 'local-1', name: 'Local' }),
      makeCustomTheme({
        id: 'same-as-store',
        name: 'Imported copy',
        installedFromStore: false,
      }),
    ];
    expect(getStoreInstalledThemeIds(themes)).toEqual(['store-1']);
  });
});

describe('getCommunityInstalledThemeIds', () => {
  it('returns only community-installed theme ids', () => {
    const themes = [
      makeCustomTheme({ id: 'community-1', name: 'Community', installedFromCommunity: true }),
      makeCustomTheme({ id: 'local-1', name: 'Local' }),
    ];
    expect(getCommunityInstalledThemeIds(themes)).toEqual(['community-1']);
  });
});

describe('isStoreThemeInstalled', () => {
  it('returns true when master id is installed', () => {
    const theme = makeStoreTheme({ id: 'master-1', name: 'Master' });
    expect(isStoreThemeInstalled(theme, ['master-1'])).toBe(true);
  });

  it('returns true when a flavour id is installed', () => {
    const theme = makeStoreTheme({
      id: 'master-1',
      name: 'Master',
      flavours: [{ id: 'flavour-1', name: 'Dark', accent_color: '#000', cover_image: '' }],
    });
    expect(isStoreThemeInstalled(theme, ['flavour-1'])).toBe(true);
  });

  it('returns false when neither master nor flavours are installed', () => {
    const theme = makeStoreTheme({
      id: 'master-1',
      name: 'Master',
      flavours: [{ id: 'flavour-1', name: 'Dark', accent_color: '#000', cover_image: '' }],
    });
    expect(isStoreThemeInstalled(theme, ['other-theme'])).toBe(false);
  });
});

describe('resolveStoreVariantAccentColor', () => {
  it('prefers installed theme colour for the variant id', () => {
    const theme = makeStoreTheme({
      id: 'master-1',
      name: 'Master',
      flavours: [{ id: 'flavour-1', name: 'Dark', accent_color: '#111111', cover_image: '' }],
    });
    expect(resolveStoreVariantAccentColor(theme, 'flavour-1', { 'flavour-1': '#ff0000' })).toBe('#ff0000');
  });

  it('falls back to flavour accent when not installed locally', () => {
    const theme = makeStoreTheme({
      id: 'master-1',
      name: 'Master',
      flavours: [{ id: 'flavour-1', name: 'Dark', accent_color: '#112233', cover_image: '' }],
    });
    expect(resolveStoreVariantAccentColor(theme, 'flavour-1')).toBe('#112233');
  });
});

describe('getThemeApplyButtonStyles', () => {
  it('uses the theme accent as the apply button background', () => {
    const styles = getThemeApplyButtonStyles('#ff0000');
    expect(styles.apply).toContain('background-color: #FF0000');
  });

  it('uses a muted version of the accent for the applied state', () => {
    const styles = getThemeApplyButtonStyles('#ff0000');
    expect(styles.applied).toContain('background-color:');
    expect(styles.applied).toContain('color: #FF0000');
  });
});
