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
import type { KontakMasterRow } from "@/data/kontakMaster";

type KontakUpdatePayload = {
  nama: string;
  alamat: string;
  kota: string;
  telepon: string;
  email: string;
  npwp: string;
  catatan: string;
};

type PelangganContextValue = {
  items: KontakMasterRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  getByKode: (kode: string) => KontakMasterRow | undefined;
  addItem: (row: KontakMasterRow) => Promise<void>;
  updateItem: (kode: string, row: KontakUpdatePayload) => Promise<void>;
  removeItem: (kode: string) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
};

const PelangganContext = createContext<PelangganContextValue | null>(null);

export function PelangganProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<KontakMasterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await invoke<KontakMasterRow[]>("pelanggan_list");
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  const getByKode = useCallback(
    (kode: string) => items.find((r) => r.kode.toLowerCase() === kode.trim().toLowerCase()),
    [items],
  );

  const kodeExists = useCallback(async (kode: string) => {
    return invoke<boolean>("pelanggan_kode_exists", { kode });
  }, []);

  const addItem = useCallback(
    async (row: KontakMasterRow) => {
      await invoke("pelanggan_insert", {
        row: {
          kode: row.kode,
          nama: row.nama,
          alamat: row.alamat,
          kota: row.kota,
          telepon: row.telepon,
          email: row.email,
          npwp: row.npwp,
          catatan: row.catatan,
        },
      });
      await refresh();
    },
    [refresh],
  );

  const updateItem = useCallback(
    async (kode: string, row: KontakUpdatePayload) => {
      await invoke("pelanggan_update", {
        kode,
        row: {
          nama: row.nama,
          alamat: row.alamat,
          kota: row.kota,
          telepon: row.telepon,
          email: row.email,
          npwp: row.npwp,
          catatan: row.catatan,
        },
      });
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (kode: string) => {
      await invoke("pelanggan_delete", { kode });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      items,
      loading,
      refresh,
      getByKode,
      addItem,
      updateItem,
      removeItem,
      kodeExists,
    }),
    [items, loading, refresh, getByKode, addItem, updateItem, removeItem, kodeExists],
  );

  return <PelangganContext.Provider value={value}>{children}</PelangganContext.Provider>;
}

export function usePelanggan() {
  const ctx = useContext(PelangganContext);
  if (!ctx) {
    throw new Error("usePelanggan harus dipakai di dalam PelangganProvider");
  }
  return ctx;
}
