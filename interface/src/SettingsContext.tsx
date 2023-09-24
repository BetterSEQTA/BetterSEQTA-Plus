// SettingsContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SettingsState } from './types/AppProps';
import useSettingsState from './hooks/settingsState';

// Create a context with an initial state
const SettingsContext = createContext<{
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
} | undefined>(undefined);

export const SettingsContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settingsState, setSettingsState] = useState<SettingsState>({
    notificationCollector: false,
    lessonAlerts: false,
    animatedBackground: false,
    animatedBackgroundSpeed: "0",
    customThemeColor: "#db6969",
    betterSEQTAPlus: true,
    shortcuts: []
  });

  useSettingsState({ settingsState, setSettingsState });

  return (
    <SettingsContext.Provider value={{ settingsState, setSettingsState }}>
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
