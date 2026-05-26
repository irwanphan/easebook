import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/features/auth/AuthContext";
import {
  QUICK_ACTIONS,
  QUICK_ACTIONS_DEFAULT_IDS,
  QUICK_ACTIONS_MAX_ACTIVE,
  getQuickAction,
  type QuickAction,
} from "@/config/quickActions";

/**
 * Preferensi tombol Akses cepat (FAB). Disimpan per-user di localStorage —
 * tidak perlu sinkron lintas device karena ini desktop app single machine.
 */
export type QuickAccessSettings = {
  /** Master switch: aktifkan FAB di seluruh halaman utama. */
  enabled: boolean;
  /** ID aksi yang ditampilkan di FAB, urut dari atas ke bawah. */
  itemIds: string[];
};

const STORAGE_PREFIX = "easybook.quick-access.v1:";
const DEFAULT_SETTINGS: QuickAccessSettings = {
  enabled: true,
  itemIds: [...QUICK_ACTIONS_DEFAULT_IDS],
};

function storageKey(username: string | null | undefined) {
  if (!username) return null;
  return `${STORAGE_PREFIX}${username.toLowerCase()}`;
}

function readSettings(username: string | null | undefined): QuickAccessSettings {
  const key = storageKey(username);
  if (!key || typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<QuickAccessSettings>;
    const ids = Array.isArray(parsed.itemIds)
      ? parsed.itemIds.filter((id): id is string => typeof id === "string" && getQuickAction(id) != null)
      : [...QUICK_ACTIONS_DEFAULT_IDS];
    // Dedup & limit defensif
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      cleaned.push(id);
      if (cleaned.length >= QUICK_ACTIONS_MAX_ACTIVE) break;
    }
    return {
      enabled: parsed.enabled !== false,
      itemIds: cleaned,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(username: string | null | undefined, settings: QuickAccessSettings) {
  const key = storageKey(username);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(settings));
  } catch {
    // localStorage tidak tersedia — diam saja, bukan critical path.
  }
}

type QuickAccessContextValue = {
  settings: QuickAccessSettings;
  /** Aksi terpilih yang juga lolos filter izin akses user (siap dipakai FAB). */
  visibleActions: QuickAction[];
  setEnabled: (enabled: boolean) => void;
  /** Atur ulang daftar id (sudah dalam urutan akhir, dedup di-handle). */
  setItemIds: (ids: string[]) => void;
  /** Reset ke default. */
  resetToDefault: () => void;
  /** Max item yang boleh aktif. */
  maxItems: number;
};

const QuickAccessContext = createContext<QuickAccessContextValue | null>(null);

export function QuickAccessProvider({ children }: { children: ReactNode }) {
  const { session, allowedKeys } = useAuth();
  const username = session?.username ?? null;
  const isAdmin = !!session?.isAdmin;

  const [settings, setSettingsState] = useState<QuickAccessSettings>(() =>
    readSettings(username),
  );

  // Sinkronisasi saat user berganti (login / logout).
  useEffect(() => {
    setSettingsState(readSettings(username));
  }, [username]);

  const persist = useCallback(
    (next: QuickAccessSettings) => {
      writeSettings(username, next);
      setSettingsState(next);
    },
    [username],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => persist({ ...settings, enabled }),
    [settings, persist],
  );

  const setItemIds = useCallback(
    (ids: string[]) => {
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const id of ids) {
        if (seen.has(id)) continue;
        if (!getQuickAction(id)) continue;
        seen.add(id);
        cleaned.push(id);
        if (cleaned.length >= QUICK_ACTIONS_MAX_ACTIVE) break;
      }
      persist({ ...settings, itemIds: cleaned });
    },
    [settings, persist],
  );

  const resetToDefault = useCallback(() => persist({ ...DEFAULT_SETTINGS }), [persist]);

  const visibleActions = useMemo<QuickAction[]>(() => {
    const list: QuickAction[] = [];
    for (const id of settings.itemIds) {
      const action = getQuickAction(id);
      if (!action) continue;
      if (!isAdmin && !allowedKeys.has(action.accessKey)) continue;
      list.push(action);
    }
    return list;
  }, [settings.itemIds, allowedKeys, isAdmin]);

  const value = useMemo<QuickAccessContextValue>(
    () => ({
      settings,
      visibleActions,
      setEnabled,
      setItemIds,
      resetToDefault,
      maxItems: QUICK_ACTIONS_MAX_ACTIVE,
    }),
    [settings, visibleActions, setEnabled, setItemIds, resetToDefault],
  );

  return <QuickAccessContext.Provider value={value}>{children}</QuickAccessContext.Provider>;
}

export function useQuickAccess(): QuickAccessContextValue {
  const ctx = useContext(QuickAccessContext);
  if (!ctx) {
    throw new Error("useQuickAccess harus dipakai di dalam QuickAccessProvider");
  }
  return ctx;
}

/** Daftar semua aksi (utility untuk halaman pengaturan). */
export { QUICK_ACTIONS };
