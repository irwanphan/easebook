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
  updateItem: (kode: string, row: Omit<KategoriGrupRow, "kode">) => Promise<void>;
  removeItem: (kode: string) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
  getByKode: (kode: string) => KategoriGrupRow | undefined;
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

  const updateItem = useCallback(
    async (kode: string, row: Omit<KategoriGrupRow, "kode">) => {
      await invoke("kategori_update", {
        kode,
        row: { nama: row.nama, deskripsi: row.deskripsi },
      });
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (kode: string) => {
      await invoke("kategori_delete", { kode });
      await refresh();
    },
    [refresh],
  );

  const getByKode = useCallback(
    (kode: string) =>
      items.find((row) => row.kode.toLowerCase() === kode.toLowerCase()),
    [items],
  );

  const value = useMemo(
    () => ({ items, loading, refresh, addItem, updateItem, removeItem, kodeExists, getByKode }),
    [items, loading, refresh, addItem, updateItem, removeItem, kodeExists, getByKode],
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
