import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  type AuthSession,
  buildLogoutUrl,
  clearStoredSession,
  completeGoogleOAuth,
  isSessionExpiring,
  readStoredSession,
  refreshAuthSession,
  startGoogleOAuth,
  storeSession
} from "./oauth";

type AuthStatus = "authenticated" | "loading" | "unauthenticated";

type AuthContextValue = {
  completeOAuth: (code: string, state: string) => Promise<{ returnTo: string; session: AuthSession }>;
  error: string | null;
  getIdToken: () => Promise<string>;
  session: AuthSession | null;
  signIn: (returnTo?: string) => Promise<void>;
  signOut: (options?: { hosted?: boolean }) => void;
  status: AuthStatus;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<AuthSession | null>(null);
  const refreshPromiseRef = useRef<Promise<AuthSession | null> | null>(null);

  const commitSession = useCallback((nextSession: AuthSession | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);

    if (nextSession) {
      storeSession(nextSession);
      setStatus("authenticated");
    } else {
      clearStoredSession();
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        if (!cancelled) {
          commitSession(null);
        }
        return;
      }

      if (!isSessionExpiring(storedSession)) {
        if (!cancelled) {
          commitSession(storedSession);
        }
        return;
      }

      const refreshedSession = await refreshAuthSession(storedSession).catch(() => null);

      if (!cancelled) {
        commitSession(refreshedSession);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [commitSession]);

  const signIn = useCallback(async (returnTo = "/") => {
    setError(null);
    await startGoogleOAuth(returnTo);
  }, []);

  const completeOAuth = useCallback(
    async (code: string, state: string) => {
      setError(null);
      const result = await completeGoogleOAuth(code, state);
      commitSession(result.session);

      return result;
    },
    [commitSession]
  );

  const signOut = useCallback(
    (options?: { hosted?: boolean }) => {
      commitSession(null);

      if (options?.hosted) {
        window.location.assign(buildLogoutUrl());
      }
    },
    [commitSession]
  );

  const getIdToken = useCallback(async () => {
    const currentSession = sessionRef.current;

    if (!currentSession) {
      throw new Error("로그인이 필요합니다.");
    }

    if (!isSessionExpiring(currentSession)) {
      return currentSession.idToken;
    }

    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = refreshAuthSession(currentSession).finally(() => {
        refreshPromiseRef.current = null;
      });
    }

    const refreshedSession = await refreshPromiseRef.current;

    if (!refreshedSession) {
      commitSession(null);
      throw new Error("로그인이 만료되었습니다.");
    }

    commitSession(refreshedSession);

    return refreshedSession.idToken;
  }, [commitSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      completeOAuth,
      error,
      getIdToken,
      session,
      signIn,
      signOut,
      status
    }),
    [completeOAuth, error, getIdToken, session, signIn, signOut, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
