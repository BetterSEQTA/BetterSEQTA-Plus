import { memo } from 'react';
import { useSettingsContext } from '../SettingsContext';

const PickerSwatch = () => {
  const { setShowPicker, settingsState } = useSettingsContext();

  const enablePicker = () => {
    setShowPicker(true);
  };

  return (
    <button
      onClick={enablePicker}
      style={{ background: settingsState.customThemeColor }}
      className="w-16 h-8 rounded-md"
    ></button>
  );
};

export default memo(PickerSwatch);
