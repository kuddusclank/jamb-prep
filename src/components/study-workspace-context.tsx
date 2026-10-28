"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

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
  const [onQuit, setOnQuit] = useState<(() => void) | undefined>(undefined);
  return (
    <WorkspaceFocusContext.Provider value={{ isFocusMode, setFocusMode, onQuit, setOnQuit }}>
      {children}
    </WorkspaceFocusContext.Provider>
  );
}

export function useWorkspaceFocus() {
  return useContext(WorkspaceFocusContext);
}
