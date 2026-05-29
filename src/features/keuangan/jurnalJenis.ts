/**
 * Label & varian badge untuk kolom `jenis` di tabel `jurnal_umum`.
 * Dipakai bersama oleh halaman Jurnal umum dan Buku besar.
 */

const JENIS_LABELS: Record<string, string> = {
  PEMBELIAN: "Pembelian (hutang / inventori)",
  PEMBELIAN_TUNAI: "Pembelian tunai (kas keluar)",
  PENJUALAN: "Penjualan (piutang)",
  PENJUALAN_TUNAI: "Penjualan tunai (kas masuk)",
  PELUNASAN_PIUTANG: "Pelunasan piutang (kas masuk)",
  PELUNASAN_HUTANG: "Pelunasan hutang (kas keluar)",
  PELUNASAN_PIUTANG_REVERSAL: "Pembalik pelunasan piutang",
  PELUNASAN_HUTANG_REVERSAL: "Pembalik pelunasan hutang",
  TRANSFER_REVERSAL: "Pembalik transfer kas",
  PENERIMAAN: "Penerimaan (pendapatan / kas masuk)",
  PENERIMAAN_LAINNYA: "Penerimaan lain (kas masuk)",
  PENGELUARAN: "Pengeluaran (biaya / kas keluar)",
  PENGELUARAN_LAINNYA: "Pengeluaran lain (kas keluar)",
  TRANSFER: "Transfer antar akun kas",
  MANUAL: "Jurnal manual",
  STOK_AWAL: "Saldo awal stok",
  KAS_AWAL: "Saldo awal kas",
  POS_OPEN: "Buka shift POS",
  POS_CLOSE: "Tutup shift POS",
};

export function jenisLabel(jenis: string): string {
  return JENIS_LABELS[jenis] ?? jenis;
}

export type JurnalJenisBadgeVariant =
  | "neutral"
  | "success"
  | "delayed"
  | "processing"
  | "warning";

export function jenisBadgeVariant(jenis: string): JurnalJenisBadgeVariant {
  if (jenis.endsWith("_REVERSAL")) return "delayed";
  if (jenis === "MANUAL") return "neutral";
  if (jenis === "PEMBELIAN" || jenis === "PEMBELIAN_TUNAI") return "neutral";
  if (jenis === "PENJUALAN" || jenis === "PENJUALAN_TUNAI") return "success";
  if (
    jenis === "PELUNASAN_PIUTANG" ||
    jenis === "PENERIMAAN" ||
    jenis === "PENERIMAAN_LAINNYA"
  ) {
    return "processing";
  }
  if (
    jenis === "PELUNASAN_HUTANG" ||
    jenis === "PENGELUARAN" ||
    jenis === "PENGELUARAN_LAINNYA"
  ) {
    return "delayed";
  }
  if (jenis === "TRANSFER") return "warning";
  if (jenis === "STOK_AWAL" || jenis === "KAS_AWAL") return "neutral";
  return "neutral";
}
