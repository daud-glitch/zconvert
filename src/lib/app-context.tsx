"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export type ViewType =
  | "converter"
  | "formats"
  | "history"
  | "bookmarks"
  | "profile"
  | "admin"
  | "admin-users"
  | "admin-settings";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AppState {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  currentUser: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requires2FA?: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppState>({
  currentView: "converter",
  setCurrentView: () => {},
  currentUser: null,
  loading: true,
  login: async () => ({ success: false, error: "Not initialized" }),
  logout: async () => {},
  refreshUser: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>("converter");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setCurrentUser(data.user || null);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setCurrentUser(data.user || null);
      } catch {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requires2FA) {
          return { success: false, requires2FA: true };
        }
        return { success: false, error: data.error || "Login failed" };
      }

      await refreshUser();
      return { success: true };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors on logout
    }
    setCurrentUser(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        currentUser,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

export { AppContext };
