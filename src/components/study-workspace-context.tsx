"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface WorkspaceFocusContextValue {
  isFocusMode: boolean;
  setFocusMode: (focused: boolean) => void;
}

const WorkspaceFocusContext = createContext<WorkspaceFocusContextValue>({
  isFocusMode: false,
  setFocusMode: () => {},
});

export function WorkspaceFocusProvider({ children }: { children: ReactNode }) {
  const [isFocusMode, setFocusMode] = useState(false);
  return (
    <WorkspaceFocusContext.Provider value={{ isFocusMode, setFocusMode }}>
      {children}
    </WorkspaceFocusContext.Provider>
  );
}

export function useWorkspaceFocus() {
  return useContext(WorkspaceFocusContext);
}
