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

type PemasokContextValue = {
  items: KontakMasterRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  getByKode: (kode: string) => KontakMasterRow | undefined;
  addItem: (row: KontakMasterRow) => Promise<void>;
  updateItem: (kode: string, row: KontakUpdatePayload) => Promise<void>;
  removeItem: (kode: string) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
};

const PemasokContext = createContext<PemasokContextValue | null>(null);

export function PemasokProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<KontakMasterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await invoke<KontakMasterRow[]>("pemasok_list");
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
    return invoke<boolean>("pemasok_kode_exists", { kode });
  }, []);

  const addItem = useCallback(
    async (row: KontakMasterRow) => {
      await invoke("pemasok_insert", {
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
      await invoke("pemasok_update", {
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
      await invoke("pemasok_delete", { kode });
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

  return <PemasokContext.Provider value={value}>{children}</PemasokContext.Provider>;
}

export function usePemasok() {
  const ctx = useContext(PemasokContext);
  if (!ctx) {
    throw new Error("usePemasok harus dipakai di dalam PemasokProvider");
  }
  return ctx;
}
