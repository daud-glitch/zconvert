"use client";

import { createContext, useContext, ReactNode } from "react";

export type ViewType =
  | "converter"
  | "formats"
  | "history"
  | "bookmarks"
  | "admin"
  | "admin-users"
  | "admin-settings";

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const AppContext = createContext<AppState>({
  currentView: "converter",
  setCurrentView: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  // Simple wrapper - actual state managed in page.tsx
  return <AppContext.Provider value={useContext(AppContext)}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

export { AppContext };
