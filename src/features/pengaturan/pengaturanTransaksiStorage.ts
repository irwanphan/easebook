/**
 * Pengaturan transaksi global — tarif PPN default + flag apakah transaksi
 * memang dikenakan PPN.
 *
 * Memisahkan `terkenaPajak` dari `ppnPersen` (alih-alih sekadar set
 * `ppnPersen = 0`) memberi 2 manfaat:
 *  1. UI bisa membedakan "saya tidak punya PPN" vs "PPN saya kebetulan 0%".
 *  2. Saat user nanti mengaktifkan kembali, tarif lama tetap tersimpan
 *     dan tidak perlu di-input ulang.
 */
export type PengaturanTransaksi = {
  /** True bila transaksi (faktur penjualan/pembelian) menyertakan PPN. */
  terkenaPajak: boolean;
  /** Tarif PPN dalam persen (contoh: 12 = 12%). */
  ppnPersen: number;
};

export const defaultPengaturanTransaksi: PengaturanTransaksi = {
  terkenaPajak: true,
  ppnPersen: 12,
};

const STORAGE_KEY = "easybook-pengaturan-transaksi";

function clampPpnPersen(n: number): number {
  if (!Number.isFinite(n)) return defaultPengaturanTransaksi.ppnPersen;
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100));
}

export function loadPengaturanTransaksi(): PengaturanTransaksi {
  if (typeof window === "undefined") return { ...defaultPengaturanTransaksi };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultPengaturanTransaksi };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { ...defaultPengaturanTransaksi };
    const o = parsed as Record<string, unknown>;
    const ppn =
      typeof o.ppnPersen === "number"
        ? o.ppnPersen
        : typeof o.ppnPersen === "string"
          ? Number.parseFloat(o.ppnPersen)
          : defaultPengaturanTransaksi.ppnPersen;
    // Backward compat: data lama tidak punya `terkenaPajak` → anggap true
    // (perilaku sebelumnya selalu mengenakan PPN).
    const terkena =
      typeof o.terkenaPajak === "boolean"
        ? o.terkenaPajak
        : defaultPengaturanTransaksi.terkenaPajak;
    return { terkenaPajak: terkena, ppnPersen: clampPpnPersen(ppn) };
  } catch {
    return { ...defaultPengaturanTransaksi };
  }
}

export function persistPengaturanTransaksi(data: PengaturanTransaksi) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      terkenaPajak: Boolean(data.terkenaPajak),
      ppnPersen: clampPpnPersen(data.ppnPersen),
    }),
  );
}

/**
 * Tarif PPN **efektif** untuk perhitungan transaksi.
 *
 * Bila `terkenaPajak=false`, tarif efektif selalu `0` walau di storage
 * tersimpan nilai lain — sehingga `pajak = subtotal * 0 = 0` dan baris
 * pajak otomatis menjadi nol di seluruh form. Tarif tersimpan (asli)
 * tetap tidak diubah; hanya nilai yang diserahkan ke kalkulasi yang
 * di-override.
 *
 * Pakai helper ini di setiap form transaksi (faktur/pesanan) alih-alih
 * `loadPengaturanTransaksi().ppnPersen` langsung, agar logika "matikan
 * PPN saat off" cukup didefinisikan sekali di sini.
 *
 * UI tetap baca `terkenaPajak` untuk memutuskan apakah perlu
 * menampilkan baris "Pajak (PPN x%)" sama sekali — perhitungan 0 yang
 * tetap dirender hanya menambah noise visual.
 */
export function getPpnEfektif(): { terkenaPajak: boolean; ppnPersen: number } {
  const t = loadPengaturanTransaksi();
  return {
    terkenaPajak: t.terkenaPajak,
    ppnPersen: t.terkenaPajak ? t.ppnPersen : 0,
  };
}
