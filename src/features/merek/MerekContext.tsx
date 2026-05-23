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
import type { MerekRow } from "@/data/merek";

type MerekContextValue = {
  items: MerekRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (row: MerekRow) => Promise<void>;
  removeItem: (kode: string) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
};

const MerekContext = createContext<MerekContextValue | null>(null);

export function MerekProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MerekRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await invoke<MerekRow[]>("merek_list");
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  const kodeExists = useCallback(async (kode: string) => {
    return invoke<boolean>("merek_kode_exists", { kode });
  }, []);

  const addItem = useCallback(
    async (row: MerekRow) => {
      await invoke("merek_insert", {
        row: { kode: row.kode, nama: row.nama, deskripsi: row.deskripsi },
      });
      await refresh();
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (kode: string) => {
      await invoke("merek_delete", { kode });
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ items, loading, refresh, addItem, removeItem, kodeExists }),
    [items, loading, refresh, addItem, removeItem, kodeExists],
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
