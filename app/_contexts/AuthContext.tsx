"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadSession,
  logoutSession,
  type SessionData,
  type SessionUser,
} from "@/app/_utils/authSession";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  session: SessionData | null;
  user: SessionUser | null;
  status: AuthStatus;
  isLoading: boolean;
  refreshSession: () => Promise<SessionData | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const restoreSession = useCallback(async () => {
    setStatus((current) => (current === "authenticated" ? current : "loading"));
    const nextSession = await loadSession({ force: true });
    setSession(nextSession);
    setStatus(nextSession ? "authenticated" : "unauthenticated");
    return nextSession;
  }, []);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const nextSession = await loadSession();
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? "authenticated" : "unauthenticated");
    };

    void initialize();

    const handleAuthChanged = () => {
      if (active) void restoreSession();
    };

    window.addEventListener("taxbee:auth-changed", handleAuthChanged);
    return () => {
      active = false;
      window.removeEventListener("taxbee:auth-changed", handleAuthChanged);
    };
  }, [restoreSession]);

  const signOut = useCallback(async () => {
    await logoutSession();
    setSession(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      isLoading: status === "loading",
      refreshSession: restoreSession,
      signOut,
    }),
    [restoreSession, session, signOut, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
