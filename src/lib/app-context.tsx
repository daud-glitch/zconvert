"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type AppUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  avatar?: string | null;
  twoFactorEnabled?: boolean;
};

type AuthResult = {
  success: boolean;
  error?: string;
  user?: AppUser | null;
  requiresTwoFactor?: boolean;
};

type ApiEnvelope = {
  success?: boolean;
  data?: unknown;
  error?: string | { message?: string; code?: string } | null;
  user?: unknown;
  requires2FA?: boolean;
  requiresTwoFactor?: boolean;
  twoFactorRequired?: boolean;
};

type AppContextValue = {
  user: AppUser | null;
  currentUser: AppUser | null;
  setUser: Dispatch<SetStateAction<AppUser | null>>;
  currentView: string;
  setCurrentView: Dispatch<SetStateAction<string>>;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (
    email: string,
    password: string,
    twoFactorCode?: string,
  ) => Promise<AuthResult>;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const noop = () => {};
const asyncOk = async (): Promise<void> => {};
const defaultAuthResult: AuthResult = { success: false, error: "Not initialized" };

const defaultContextValue: AppContextValue = {
  user: null,
  currentUser: null,
  setUser: noop as Dispatch<SetStateAction<AppUser | null>>,
  currentView: "home",
  setCurrentView: noop as Dispatch<SetStateAction<string>>,
  loading: true,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  login: async () => defaultAuthResult,
  signup: async () => defaultAuthResult,
  logout: asyncOk,
  refreshUser: asyncOk,
};

const AppContext = createContext<AppContextValue>(defaultContextValue);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asUser(value: unknown): AppUser | null {
  if (!isRecord(value) || typeof value.email !== "string") return null;

  return {
    id: typeof value.id === "string" ? value.id : value.email,
    email: value.email,
    name: typeof value.name === "string" ? value.name : null,
    role: typeof value.role === "string" ? value.role : "user",
    avatar: typeof value.avatar === "string" ? value.avatar : null,
    twoFactorEnabled:
      typeof value.twoFactorEnabled === "boolean"
        ? value.twoFactorEnabled
        : false,
  };
}

function getEnvelopeUser(payload: unknown): AppUser | null {
  if (!isRecord(payload)) return null;

  const directUser = asUser(payload.user);
  if (directUser) return directUser;

  const data = payload.data;
  if (isRecord(data)) {
    const nestedUser = asUser(data.user);
    if (nestedUser) return nestedUser;
  }

  return asUser(data);
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const error = payload.error;
  if (typeof error === "string") return error;
  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }
  if (typeof payload.message === "string") return payload.message;

  return fallback;
}

async function readJson(res: Response): Promise<ApiEnvelope> {
  try {
    return (await res.json()) as ApiEnvelope;
  } catch {
    return {};
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [currentView, setCurrentView] = useState("home");
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const payload = await readJson(res);

      if (!res.ok || payload.success === false) {
        setUser(null);
        return;
      }

      setUser(getEnvelopeUser(payload));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      twoFactorCode?: string,
    ): Promise<AuthResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            ...(twoFactorCode ? { token: twoFactorCode } : {}),
          }),
        });
        const payload = await readJson(res);
        const requiresTwoFactor = Boolean(
          payload.requires2FA ||
            payload.requiresTwoFactor ||
            payload.twoFactorRequired,
        );

        if (requiresTwoFactor && !getEnvelopeUser(payload)) {
          return { success: false, requiresTwoFactor: true };
        }

        if (!res.ok || payload.success === false) {
          return {
            success: false,
            error: getErrorMessage(payload, "Login failed"),
            requiresTwoFactor,
          };
        }

        const nextUser = getEnvelopeUser(payload);
        setUser(nextUser);

        return { success: true, user: nextUser };
      } catch {
        return { success: false, error: "Network error" };
      }
    },
    [],
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
    ): Promise<AuthResult> => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const payload = await readJson(res);

        if (!res.ok || payload.success === false) {
          return {
            success: false,
            error: getErrorMessage(payload, "Signup failed"),
          };
        }

        const nextUser = getEnvelopeUser(payload);
        setUser(nextUser);

        return { success: true, user: nextUser };
      } catch {
        return { success: false, error: "Network error" };
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Swallow logout transport errors and still clear local session state.
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      currentUser: user,
      setUser,
      currentView,
      setCurrentView,
      loading,
      isLoading: loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      login,
      signup,
      logout,
      refreshUser,
    }),
    [currentView, loading, login, logout, refreshUser, signup, user],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}

export const useAppContext = useApp;
