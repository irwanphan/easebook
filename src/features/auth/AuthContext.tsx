import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { canAccessPath as checkPathAccess, filterPrimaryNavEntries } from "@/lib/halamanAkses";
import type { PrimaryNavEntry } from "@/config/navigation";
import type { PenggunaSession } from "@/data/pengguna";
import { tauriErrorMessage } from "@/lib/tauriError";

const SESSION_STORAGE_KEY = "easybook_session";

export type AuthSession = PenggunaSession;

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  allowedKeys: Set<string>;
  canAccessPath: (pathname: string) => boolean;
  filterNav: (entries: PrimaryNavEntry[]) => PrimaryNavEntry[];
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (!session) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((data: AuthSession | null) => {
    setSession(data);
    persistSession(data);
  }, []);

  const refreshSession = useCallback(async () => {
    const stored = readStoredSession();
    if (!stored?.username) {
      applySession(null);
      return;
    }
    const data = await invoke<AuthSession>("pengguna_session_get", {
      username: stored.username,
    });
    applySession(data);
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const stored = readStoredSession();
      if (!stored?.username) {
        if (!cancelled) {
          applySession(null);
          setLoading(false);
        }
        return;
      }
      try {
        const data = await invoke<AuthSession>("pengguna_session_get", {
          username: stored.username,
        });
        if (!cancelled) applySession(data);
      } catch (e) {
        console.warn("Auth bootstrap:", tauriErrorMessage(e));
        if (!cancelled) applySession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applySession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await invoke<AuthSession>("pengguna_login", {
        username: username.trim(),
        password,
      });
      applySession(data);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    applySession(null);
  }, [applySession]);

  const allowedKeys = useMemo(
    () => new Set(session?.halamanAkses ?? []),
    [session?.halamanAkses],
  );

  const isAdmin = session?.isAdmin ?? false;

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: session != null,
      allowedKeys,
      canAccessPath: (pathname: string) => {
        if (!session) return false;
        return checkPathAccess(pathname, isAdmin, allowedKeys);
      },
      filterNav: (entries) => {
        if (!session) return [];
        return filterPrimaryNavEntries(entries, isAdmin, allowedKeys);
      },
      login,
      logout,
      refreshSession,
    }),
    [session, loading, allowedKeys, isAdmin, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider");
  }
  return ctx;
}
