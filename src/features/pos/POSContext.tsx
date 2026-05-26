import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PosCartLine, PosCatalogItem, PosShift } from "@/data/pos";
import { POS_PELANGGAN_DEFAULT_KODE } from "@/data/pos";
import { useAuth } from "@/features/auth/AuthContext";
import { shiftActiveFor, shiftChangeGudang } from "@/features/pos/posInvoke";
import { tauriErrorMessage } from "@/lib/tauriError";

type PelangganRef = {
  kode: string;
  nama: string;
};

type POSContextValue = {
  /** Shift aktif untuk kasir saat ini, atau null bila belum buka shift. */
  shift: PosShift | null;
  shiftLoading: boolean;
  shiftError: string | null;
  refreshShift: () => Promise<void>;
  setShift: (s: PosShift | null) => void;
  /**
   * Ganti gudang aktif pada shift terbuka. Hanya boleh dipanggil saat
   * keranjang kosong (cart.length === 0). Backend juga akan menolak bila
   * shift sudah memiliki transaksi terkait.
   */
  changeGudang: (gudangKode: string) => Promise<PosShift>;

  /** Pelanggan terpilih (default walk-in GUEST). */
  pelanggan: PelangganRef;
  setPelanggan: (p: PelangganRef) => void;
  resetPelanggan: () => void;

  /** Diskon faktur (Rp) dan pajak (Rp). */
  diskonFaktur: number;
  setDiskonFaktur: (n: number) => void;
  pajak: number;
  setPajak: (n: number) => void;

  /** Cart state — operasi mutasi semua diekspos di sini. */
  cart: PosCartLine[];
  addToCart: (item: PosCatalogItem, qty?: number) => void;
  updateLineQty: (uid: string, qty: number) => void;
  updateLineHarga: (uid: string, harga: number) => void;
  updateLineDiskon: (uid: string, diskon: number) => void;
  updateLineCatatan: (uid: string, catatan: string) => void;
  removeLine: (uid: string) => void;
  clearCart: () => void;

  /** Computed totals. */
  subtotal: number;
  total: number;
  jumlahItem: number;
};

const POSContext = createContext<POSContextValue | null>(null);

const WALK_IN: PelangganRef = {
  kode: POS_PELANGGAN_DEFAULT_KODE,
  nama: "Pelanggan Umum",
};

function makeUid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampNonNegative(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function POSProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const username = session?.username ?? "";

  const [shift, setShiftState] = useState<PosShift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState<string | null>(null);

  const [pelanggan, setPelangganState] = useState<PelangganRef>(WALK_IN);
  const [diskonFaktur, setDiskonFakturState] = useState(0);
  const [pajak, setPajakState] = useState(0);
  const [cart, setCart] = useState<PosCartLine[]>([]);

  const refreshShift = useCallback(async () => {
    if (!username) {
      setShiftState(null);
      setShiftLoading(false);
      return;
    }
    setShiftLoading(true);
    setShiftError(null);
    try {
      const result = await shiftActiveFor(username);
      setShiftState(result);
    } catch (e) {
      setShiftError(tauriErrorMessage(e));
      setShiftState(null);
    } finally {
      setShiftLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void refreshShift();
  }, [refreshShift]);

  const setShift = useCallback((s: PosShift | null) => {
    setShiftState(s);
  }, []);

  const changeGudang = useCallback(
    async (gudangKode: string) => {
      const current = shift;
      if (!current) {
        throw new Error("Tidak ada shift aktif.");
      }
      const next = await shiftChangeGudang({
        id: current.id,
        gudangKode,
      });
      setShiftState(next);
      return next;
    },
    [shift],
  );

  const setPelanggan = useCallback((p: PelangganRef) => {
    setPelangganState({ kode: p.kode, nama: p.nama });
  }, []);
  const resetPelanggan = useCallback(() => setPelangganState(WALK_IN), []);

  const setDiskonFaktur = useCallback(
    (n: number) => setDiskonFakturState(clampNonNegative(n)),
    [],
  );
  const setPajak = useCallback((n: number) => setPajakState(clampNonNegative(n)), []);

  const addToCart = useCallback((item: PosCatalogItem, qty = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (line) =>
          line.barangKode.toLowerCase() === item.kode.toLowerCase() &&
          line.hargaSatuan === item.harga &&
          line.diskon === 0,
      );
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      const line: PosCartLine = {
        uid: makeUid(),
        barangKode: item.kode,
        barangNama: item.nama,
        satuan: item.satuan,
        satuanTingkat: 1,
        qty,
        hargaSatuan: item.harga,
        diskon: 0,
        catatan: "",
        stokTersedia: item.stokDiGudang,
        isBarang: item.tipe === "Barang",
      };
      return [...prev, line];
    });
  }, []);

  const updateLineQty = useCallback((uid: string, qty: number) => {
    setCart((prev) =>
      prev.map((line) =>
        line.uid === uid
          ? { ...line, qty: Math.max(1, Math.round(qty || 0)) }
          : line,
      ),
    );
  }, []);
  const updateLineHarga = useCallback((uid: string, harga: number) => {
    setCart((prev) =>
      prev.map((line) =>
        line.uid === uid ? { ...line, hargaSatuan: clampNonNegative(harga) } : line,
      ),
    );
  }, []);
  const updateLineDiskon = useCallback((uid: string, diskon: number) => {
    setCart((prev) =>
      prev.map((line) =>
        line.uid === uid ? { ...line, diskon: clampNonNegative(diskon) } : line,
      ),
    );
  }, []);
  const updateLineCatatan = useCallback((uid: string, catatan: string) => {
    setCart((prev) =>
      prev.map((line) => (line.uid === uid ? { ...line, catatan } : line)),
    );
  }, []);
  const removeLine = useCallback((uid: string) => {
    setCart((prev) => prev.filter((line) => line.uid !== uid));
  }, []);
  const clearCart = useCallback(() => {
    setCart([]);
    setDiskonFakturState(0);
    setPajakState(0);
    setPelangganState(WALK_IN);
  }, []);

  const { subtotal, total, jumlahItem } = useMemo(() => {
    const sub = cart.reduce(
      (acc, line) => acc + Math.max(0, (line.hargaSatuan - line.diskon) * line.qty),
      0,
    );
    const tot = Math.max(0, sub - diskonFaktur + pajak);
    const items = cart.reduce((acc, line) => acc + line.qty, 0);
    return { subtotal: sub, total: tot, jumlahItem: items };
  }, [cart, diskonFaktur, pajak]);

  const value = useMemo<POSContextValue>(
    () => ({
      shift,
      shiftLoading,
      shiftError,
      refreshShift,
      setShift,
      changeGudang,
      pelanggan,
      setPelanggan,
      resetPelanggan,
      diskonFaktur,
      setDiskonFaktur,
      pajak,
      setPajak,
      cart,
      addToCart,
      updateLineQty,
      updateLineHarga,
      updateLineDiskon,
      updateLineCatatan,
      removeLine,
      clearCart,
      subtotal,
      total,
      jumlahItem,
    }),
    [
      shift,
      shiftLoading,
      shiftError,
      refreshShift,
      setShift,
      changeGudang,
      pelanggan,
      setPelanggan,
      resetPelanggan,
      diskonFaktur,
      setDiskonFaktur,
      pajak,
      setPajak,
      cart,
      addToCart,
      updateLineQty,
      updateLineHarga,
      updateLineDiskon,
      updateLineCatatan,
      removeLine,
      clearCart,
      subtotal,
      total,
      jumlahItem,
    ],
  );

  return <POSContext.Provider value={value}>{children}</POSContext.Provider>;
}

export function usePOS() {
  const ctx = useContext(POSContext);
  if (!ctx) {
    throw new Error("usePOS harus dipakai di dalam POSProvider");
  }
  return ctx;
}
