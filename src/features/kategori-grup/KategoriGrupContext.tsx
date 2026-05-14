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
import type { KategoriGrupRow } from "@/data/kategoriGrup";

type KategoriGrupContextValue = {
  items: KategoriGrupRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (row: KategoriGrupRow) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
};

const KategoriGrupContext = createContext<KategoriGrupContextValue | null>(null);

export function KategoriGrupProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<KategoriGrupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await invoke<KategoriGrupRow[]>("kategori_list");
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  const kodeExists = useCallback(async (kode: string) => {
    return invoke<boolean>("kategori_kode_exists", { kode });
  }, []);

  const addItem = useCallback(
    async (row: KategoriGrupRow) => {
      await invoke("kategori_insert", {
        row: { kode: row.kode, nama: row.nama, deskripsi: row.deskripsi },
      });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ items, loading, refresh, addItem, kodeExists }),
    [items, loading, refresh, addItem, kodeExists],
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
