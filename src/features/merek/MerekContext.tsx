import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { MerekRow } from "@/data/merek";
import { mockMerek } from "@/data/merek";

const STORAGE_KEY = "easybook-merek-items";

function loadItems(): MerekRow[] {
  if (typeof window === "undefined") return [...mockMerek];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...mockMerek];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...mockMerek];
    return parsed as MerekRow[];
  } catch {
    return [...mockMerek];
  }
}

function persistItems(items: MerekRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type MerekContextValue = {
  items: MerekRow[];
  addItem: (row: MerekRow) => boolean;
  kodeExists: (kode: string) => boolean;
};

const MerekContext = createContext<MerekContextValue | null>(null);

export function MerekProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MerekRow[]>(() => loadItems());

  const kodeExists = useCallback(
    (kode: string) => items.some((r) => r.kode.toLowerCase() === kode.trim().toLowerCase()),
    [items],
  );

  const addItem = useCallback(
    (row: MerekRow) => {
      if (kodeExists(row.kode)) return false;
      setItems((prev) => {
        const next = [...prev, row];
        persistItems(next);
        return next;
      });
      return true;
    },
    [kodeExists],
  );

  const value = useMemo(
    () => ({ items, addItem, kodeExists }),
    [items, addItem, kodeExists],
  );

  return <MerekContext.Provider value={value}>{children}</MerekContext.Provider>;
}

export function useMerek() {
  const ctx = useContext(MerekContext);
  if (!ctx) {
    throw new Error("useMerek harus dipakai di dalam MerekProvider");
  }
  return ctx;
}
