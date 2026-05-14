import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GudangRow } from "@/data/gudang";
import { mockGudang } from "@/data/gudang";

const STORAGE_KEY = "easybook-gudang-items";

function loadItems(): GudangRow[] {
  if (typeof window === "undefined") return [...mockGudang];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...mockGudang];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...mockGudang];
    return parsed as GudangRow[];
  } catch {
    return [...mockGudang];
  }
}

function persistItems(items: GudangRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type GudangContextValue = {
  items: GudangRow[];
  addItem: (row: GudangRow) => boolean;
  kodeExists: (kode: string) => boolean;
};

const GudangContext = createContext<GudangContextValue | null>(null);

export function GudangProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<GudangRow[]>(() => loadItems());

  const kodeExists = useCallback(
    (kode: string) => items.some((r) => r.kode.toLowerCase() === kode.trim().toLowerCase()),
    [items],
  );

  const addItem = useCallback(
    (row: GudangRow) => {
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

  return <GudangContext.Provider value={value}>{children}</GudangContext.Provider>;
}

export function useGudang() {
  const ctx = useContext(GudangContext);
  if (!ctx) {
    throw new Error("useGudang harus dipakai di dalam GudangProvider");
  }
  return ctx;
}
