import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BarangJasaRow } from "@/data/mockData";
import { mockBarangJasa } from "@/data/mockData";

const STORAGE_KEY = "easybook-barang-jasa-items";

function loadItems(): BarangJasaRow[] {
  if (typeof window === "undefined") return [...mockBarangJasa];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...mockBarangJasa];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...mockBarangJasa];
    return parsed as BarangJasaRow[];
  } catch {
    return [...mockBarangJasa];
  }
}

function persistItems(items: BarangJasaRow[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

type BarangJasaContextValue = {
  items: BarangJasaRow[];
  addItem: (row: BarangJasaRow) => boolean;
  kodeExists: (kode: string) => boolean;
};

const BarangJasaContext = createContext<BarangJasaContextValue | null>(null);

export function BarangJasaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BarangJasaRow[]>(() => loadItems());

  const kodeExists = useCallback(
    (kode: string) => items.some((r) => r.kode.toLowerCase() === kode.trim().toLowerCase()),
    [items],
  );

  const addItem = useCallback((row: BarangJasaRow) => {
    if (kodeExists(row.kode)) return false;
    setItems((prev) => {
      const next = [...prev, row];
      persistItems(next);
      return next;
    });
    return true;
  }, [kodeExists]);

  const value = useMemo(
    () => ({ items, addItem, kodeExists }),
    [items, addItem, kodeExists],
  );

  return (
    <BarangJasaContext.Provider value={value}>{children}</BarangJasaContext.Provider>
  );
}

export function useBarangJasa() {
  const ctx = useContext(BarangJasaContext);
  if (!ctx) {
    throw new Error("useBarangJasa harus dipakai di dalam BarangJasaProvider");
  }
  return ctx;
}
