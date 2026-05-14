import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KategoriGrupRow } from "@/data/kategoriGrup";
import { mockKategoriGrup } from "@/data/kategoriGrup";

const STORAGE_KEY = "easybook-kategori-grup-items";

function loadItems(): KategoriGrupRow[] {
  if (typeof window === "undefined") return [...mockKategoriGrup];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...mockKategoriGrup];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...mockKategoriGrup];
    return parsed as KategoriGrupRow[];
  } catch {
    return [...mockKategoriGrup];
  }
}

function persistItems(items: KategoriGrupRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type KategoriGrupContextValue = {
  items: KategoriGrupRow[];
  addItem: (row: KategoriGrupRow) => boolean;
  kodeExists: (kode: string) => boolean;
};

const KategoriGrupContext = createContext<KategoriGrupContextValue | null>(null);

export function KategoriGrupProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<KategoriGrupRow[]>(() => loadItems());

  const kodeExists = useCallback(
    (kode: string) => items.some((r) => r.kode.toLowerCase() === kode.trim().toLowerCase()),
    [items],
  );

  const addItem = useCallback(
    (row: KategoriGrupRow) => {
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

  return (
    <KategoriGrupContext.Provider value={value}>{children}</KategoriGrupContext.Provider>
  );
}

export function useKategoriGrup() {
  const ctx = useContext(KategoriGrupContext);
  if (!ctx) {
    throw new Error("useKategoriGrup harus dipakai di dalam KategoriGrupProvider");
  }
  return ctx;
}
