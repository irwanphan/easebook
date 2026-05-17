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
import { tauriErrorMessage } from "@/lib/tauriError";

const SESSION_STORAGE_KEY = "easybook_session";

export type AuthSession = {
  username: string;
  namaLengkap: string;
  isAdmin: boolean;
  halamanAkses: string[];
};

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  allowedKeys: Set<string>;
  canAccessPath: (pathname: string) => boolean;
  filterNav: (entries: PrimaryNavEntry[]) => PrimaryNavEntry[];
  setSessionUser: (username: string) => Promise<void>;
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

  const loadSession = useCallback(async (username: string) => {
    const data = await invoke<AuthSession>("pengguna_session_get", { username });
    setSession(data);
    persistSession(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const stored = readStoredSession();
      const username = stored?.username ?? "admin";
      try {
        const data = await invoke<AuthSession>("pengguna_session_get", { username });
        if (!cancelled) {
          setSession(data);
          persistSession(data);
        }
      } catch (e) {
        console.warn("Auth bootstrap:", tauriErrorMessage(e));
        if (!cancelled && stored) {
          setSession(stored);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const allowedKeys = useMemo(
    () => new Set(session?.halamanAkses ?? []),
    [session?.halamanAkses],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      allowedKeys,
      canAccessPath: (pathname: string) =>
        checkPathAccess(pathname, session?.isAdmin ?? true, allowedKeys),
      filterNav: (entries) =>
        filterPrimaryNavEntries(entries, session?.isAdmin ?? true, allowedKeys),
      setSessionUser: loadSession,
    }),
    [session, loading, allowedKeys, loadSession],
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
