import localforage from 'localforage';
import type { CustomTheme } from '@/old-interface/types/CustomThemes';
import { applyTheme } from './applyTheme';
import { settingsState } from '@/seqta/utils/listeners/SettingsState';


export const enableCurrentTheme = async () => {
  if (settingsState.selectedTheme) {
    const theme = await localforage.getItem(settingsState.selectedTheme) as CustomTheme;
    if (theme) {
      await applyTheme(theme, true);
    }
  }
};
