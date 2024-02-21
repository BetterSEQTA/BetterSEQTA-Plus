import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SettingsState } from './types/AppProps';
import useSettingsState from './hooks/settingsState';

// Create a context with an initial state
const SettingsContext = createContext<{
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
  showPicker: boolean;
  setShowPicker: React.Dispatch<React.SetStateAction<boolean>>;
  standalone: boolean;
  setStandalone: React.Dispatch<React.SetStateAction<boolean>>;
} | undefined>(undefined);

export const SettingsContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settingsState, setSettingsState] = useState<SettingsState>({
    notificationCollector: false,
    lessonAlerts: false,
    telemetry: false,
    animatedBackground: false,
    animatedBackgroundSpeed: "0",
    customThemeColor: "rgba(219, 105, 105, 1)",
    betterSEQTAPlus: true,
    shortcuts: [],
    customshortcuts: [],
    transparencyEffects: false,
    theme: ""
  });

  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [standalone, setStandalone] = useState<boolean>(false);

  useSettingsState({ settingsState, setSettingsState });

  return (
    <SettingsContext.Provider value={{ settingsState, setSettingsState, showPicker, setShowPicker, standalone, setStandalone }}>
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsContextProvider');
  }
  return context;
};
