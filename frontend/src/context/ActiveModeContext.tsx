import React, { createContext, useContext, useState } from 'react';

export type ActiveMode = 'requester' | 'fixer';

interface ActiveModeContextValue {
  activeMode: ActiveMode;
  setActiveMode: (mode: ActiveMode) => void;
}

const ActiveModeContext = createContext<ActiveModeContextValue>({
  activeMode: 'requester',
  setActiveMode: () => {},
});

export function ActiveModeProvider({ children }: { children: React.ReactNode }) {
  const [activeMode, setActiveMode] = useState<ActiveMode>('requester');
  return (
    <ActiveModeContext.Provider value={{ activeMode, setActiveMode }}>
      {children}
    </ActiveModeContext.Provider>
  );
}

export function useActiveMode() {
  return useContext(ActiveModeContext);
}
