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
import type { GudangRow } from "@/data/gudang";

type GudangContextValue = {
  items: GudangRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (row: GudangRow) => Promise<void>;
  removeItem: (kode: string) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
};

const GudangContext = createContext<GudangContextValue | null>(null);

export function GudangProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<GudangRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await invoke<GudangRow[]>("gudang_list");
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  const kodeExists = useCallback(async (kode: string) => {
    return invoke<boolean>("gudang_kode_exists", { kode });
  }, []);

  const addItem = useCallback(
    async (row: GudangRow) => {
      await invoke("gudang_insert", {
        row: {
          kode: row.kode,
          nama: row.nama,
          alamat: row.alamat,
          lokasi: row.lokasi,
          pic: row.pic,
          nomorKontak: row.nomorKontak,
          luasM2: row.luasM2,
          kapasitasPenyimpanan: row.kapasitasPenyimpanan,
        },
      });
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (kode: string) => {
      await invoke("gudang_delete", { kode });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ items, loading, refresh, addItem, removeItem, kodeExists }),
    [items, loading, refresh, addItem, removeItem, kodeExists],
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
