/** Satu baris saldo awal stok (satu pasangan barang × gudang). */
export type StokAwalEntryRow = {
  barangKode: string;
  barangNama: string;
  gudangKode: string;
  gudangNama: string;
  /** Qty di satuan terpilih (lihat `satuanTingkat`). */
  qty: number;
  /** Tingkat satuan saat user input (1 = paling besar, dst.). */
  satuanTingkat: number;
  /** Nama satuan di tingkat tersebut. */
  satuanNama: string;
  /** Qty hasil konversi ke satuan terkecil — yang dipakai stok_mutasi. */
  qtySmallest: number;
  /** Nilai per satuan terpilih (Rp). */
  nilaiPerUnit: number;
  /** = qty × nilaiPerUnit. Dipakai sebagai basis HPP awal & jurnal pembuka. */
  subtotalNilai: number;
};

/** Snapshot lengkap saldo awal stok + prasyarat. */
export type StokAwalSnapshot = {
  awalPeriode: string | null;
  /** Akun persediaan / inventori (dari `jurnal_konfigurasi.akunPembelian`). */
  akunPersediaanKode: string | null;
  akunPersediaanNama: string | null;
  akunHistoricalBalanceKode: string | null;
  akunHistoricalBalanceNama: string | null;
  entries: StokAwalEntryRow[];
  tanggalJurnal: string | null;
  jurnalId: number | null;
  /** Total nilai persediaan awal aktif (Rp). */
  totalNilai: number;
};

export type StokAwalEntryInput = {
  barangKode: string;
  gudangKode: string;
  qty: number;
  satuanTingkat: number;
  nilaiPerUnit: number;
};

export type StokAwalSetPayload = {
  entries: StokAwalEntryInput[];
};

/** Prasyarat dipenuhi bila tanggal awal periode, akun persediaan, dan akun
 *  historical balance semuanya sudah diset. */
export function isStokAwalSiap(snap: StokAwalSnapshot): boolean {
  return (
    Boolean(snap.awalPeriode) &&
    Boolean(snap.akunPersediaanKode) &&
    Boolean(snap.akunHistoricalBalanceKode)
  );
}
