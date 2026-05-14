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
import type { BarangJasaRow } from "@/data/mockData";

type BarangJasaContextValue = {
  items: BarangJasaRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (row: BarangJasaRow) => Promise<void>;
  kodeExists: (kode: string) => Promise<boolean>;
};

const BarangJasaContext = createContext<BarangJasaContextValue | null>(null);

export function BarangJasaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BarangJasaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await invoke<BarangJasaRow[]>("barang_jasa_list");
    setItems(
      list.map((r) => ({
        ...r,
        tipe: r.tipe as "Barang" | "Jasa",
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setLoading(false));
  }, [refresh]);

  const kodeExists = useCallback(async (kode: string) => {
    return invoke<boolean>("barang_jasa_kode_exists", { kode });
  }, []);

  const addItem = useCallback(
    async (row: BarangJasaRow) => {
      await invoke("barang_jasa_insert", {
        row: {
          kode: row.kode,
          nama: row.nama,
          tipe: row.tipe,
          satuan: row.satuan,
          harga: row.harga,
          stok: row.tipe === "Barang" ? row.stok ?? null : null,
          kategoriKode: row.kategoriKode ?? null,
          merekKode: row.merekKode ?? null,
          defaultGudangKode: row.defaultGudangKode ?? null,
        },
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
