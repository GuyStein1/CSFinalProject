import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActiveMode = 'requester' | 'fixer';

interface ActiveModeContextValue {
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => void;
}

export const ACTIVE_MODE_STORAGE_KEY = '@fixit_active_mode';

const ActiveModeContext = createContext<ActiveModeContextValue>({
  activeMode: 'requester',
  setActiveMode: () => {},
});

export function ActiveModeProvider({ children }: { children: React.ReactNode }) {
  const [activeMode, setActiveModeState] = useState<ActiveMode>('requester');

  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_MODE_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'fixer' || stored === 'requester') {
          setActiveModeState(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setActiveMode = useCallback((mode: ActiveMode) => {
    setActiveModeState(mode);
    AsyncStorage.setItem(ACTIVE_MODE_STORAGE_KEY, mode).catch(() => {});
  }, []);

  return (
    <ActiveModeContext.Provider value={{ activeMode, setActiveMode }}>
      {children}
    </ActiveModeContext.Provider>
  );
}

export function useActiveMode() {
  return useContext(ActiveModeContext);
}
