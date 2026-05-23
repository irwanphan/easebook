/**
 * Tipe data laporan HPP (moving average) per barang.
 *
 * HPP dihitung global per item (lintas gudang) dengan rumus rata-rata
 * bergerak: setiap pembelian merekalkulasi HPP berdasarkan stok lama,
 * HPP lama, dan harga beli baru. Penjualan & mutasi antar gudang tidak
 * mengubah HPP (hanya mengubah posisi stok).
 */

/** Satu baris ringkasan HPP terkini per barang. */
export type HppListRow = {
  kode: string;
  nama: string;
  satuan: string;
  /** Stok terkini dalam satuan terkecil. */
  stok: number;
  /** HPP per satuan terkecil (Rp), hasil pembulatan ke integer. */
  hpp: number;
  /** Total nilai persediaan (Rp) ≈ stok × hpp. */
  totalNilai: number;
  /** Jumlah event stok yang ikut diperhitungkan (info ringan untuk UI). */
  jumlahEvent: number;
};

/** Satu event historis yang mengubah (atau dicatat sebagai bagian dari) HPP. */
export type HppHistoryEvent = {
  /** Unix-epoch detik (sesuai field `waktu` di stok_mutasi). */
  waktu: number;
  /** Tanggal dokumen (ISO yyyy-mm-dd). */
  tanggalTransaksi: string;
  /** Jenis mutasi mentah ("PEMBELIAN" / "PENJUALAN" / "MUTASI_GUDANG" / dst.). */
  jenis: string;
  referensi: string;
  gudangKode: string;
  gudangNama: string;
  qtyMasuk: number;
  qtyKeluar: number;
  /** Harga beli per satuan terkecil (Rp). Hanya terisi untuk PEMBELIAN. */
  hargaSatuanBeli: number | null;
  /** Nilai event (Rp). + saat masuk, − saat keluar (qty × HPP saat itu). */
  nilaiEvent: number;
  stokSetelah: number;
  hppSetelah: number;
  totalNilaiSetelah: number;
  catatan: string;
};

/** Detail HPP satu barang: snapshot terkini + seluruh histori event. */
export type HppDetail = {
  kode: string;
  nama: string;
  satuan: string;
  stokAkhir: number;
  hppAkhir: number;
  totalNilaiAkhir: number;
  events: HppHistoryEvent[];
};

/** Label friendly untuk jenis event di tabel laporan HPP. */
export function labelJenisEventHpp(jenis: string): string {
  const j = jenis.trim().toUpperCase();
  if (j === "PEMBELIAN" || j === "PEMBELIAN_TUNAI") return "Pembelian";
  if (j === "PENJUALAN" || j === "PENJUALAN_TUNAI") return "Penjualan";
  if (j === "MUTASI_GUDANG") return "Mutasi antar gudang";
  if (j === "ADJUSTMENT") return "Penyesuaian";
  return jenis;
}

/**
 * Apakah event ini benar-benar mengubah nilai HPP?
 *
 * Hanya pembelian (qty masuk + harga beli) yang merekalkulasi HPP.
 * Event lain ditampilkan untuk transparansi tapi HPP tidak berubah.
 */
export function eventMengubahHpp(ev: HppHistoryEvent): boolean {
  const j = ev.jenis.trim().toUpperCase();
  return (
    (j === "PEMBELIAN" || j === "PEMBELIAN_TUNAI") &&
    ev.qtyMasuk > 0 &&
    ev.hargaSatuanBeli !== null
  );
}
