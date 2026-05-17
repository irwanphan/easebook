/** Satu baris mutasi stok (API `stok_mutasi_for_barang` / `stok_mutasi_laporan`). */
export type StokMutasiRow = {
  id: number;
  waktu: number;
  tanggalTransaksi: string;
  barangKode: string;
  barangNama: string;
  gudangKode: string;
  gudangNama: string;
  jenis: string;
  referensi: string;
  qtyMasuk: number;
  qtyKeluar: number;
  saldoSetelah: number;
  catatan: string;
};

export function labelJenisMutasi(jenis: string): string {
  if (jenis === "PEMBELIAN") return "Pembelian";
  if (jenis === "PENJUALAN") return "Penjualan";
  if (jenis === "MUTASI_GUDANG") return "Mutasi antar gudang";
  if (jenis === "ADJUSTMENT") return "Penyesuaian";
  return jenis;
}
