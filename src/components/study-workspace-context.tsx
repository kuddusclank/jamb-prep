"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface WorkspaceFocusContextValue {
  isFocusMode: boolean;
  setFocusMode: (focused: boolean) => void;
  onQuit?: () => void;
  setOnQuit: (handler?: (() => void) | undefined) => void;
}

const WorkspaceFocusContext = createContext<WorkspaceFocusContextValue>({
  isFocusMode: false,
  setFocusMode: () => {},
  onQuit: undefined,
  setOnQuit: () => {},
});

export function WorkspaceFocusProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setFocusMode] = useState(false);
  const [onQuit, setOnQuitState] = useState<(() => void) | undefined>(undefined);

  const setOnQuit = useCallback((handler?: (() => void) | undefined) => {
    setOnQuitState(() => handler);
  }, []);

  return (
    <WorkspaceFocusContext.Provider value={{ isFocusMode, setFocusMode, onQuit, setOnQuit }}>
      {children}
    </WorkspaceFocusContext.Provider>
  );
}

export function useWorkspaceFocus() {
  return useContext(WorkspaceFocusContext);
}
