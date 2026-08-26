import type { CustomTheme } from '@/types/CustomThemes';
import type { Theme } from '@/interface/types/Theme';
import {
  filterThemesByMode,
  getThemeApplyButtonStyles,
  isStoreThemeInstalled,
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

describe('filterThemesByMode', () => {
  const downloaded = makeCustomTheme({ id: 'store-1', name: 'Store Theme', isEditable: false });
  const custom = makeCustomTheme({ id: 'custom-1', name: 'Custom Theme', isEditable: true });

  it('returns all themes in all mode', () => {
    expect(filterThemesByMode([downloaded, custom], 'all')).toEqual([downloaded, custom]);
  });

  it('returns only non-editable themes in downloaded mode', () => {
    expect(filterThemesByMode([downloaded, custom], 'downloaded')).toEqual([downloaded]);
  });

  it('returns only editable themes in custom mode', () => {
    expect(filterThemesByMode([downloaded, custom], 'custom')).toEqual([custom]);
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
