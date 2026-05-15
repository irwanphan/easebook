/** Semua akun keuangan (untuk konfigurasi jurnal). */
export type AkunKeuanganRow = {
  kode: string;
  nama: string;
  peranJurnal: string;
  saldo: number;
};

/** Akun kas/bank (halaman Akun kas). */
export type AkunKasRow = {
  kode: string;
  nama: string;
  peranJurnal: string;
  saldo: number;
};

export type AkunKasInsertPayload = {
  kode: string;
  nama: string;
  /** Dicatat sebagai di jurnal: `KAS` atau `BANK`. */
  peranJurnal: string;
};

export const PERAN_JURNAL_KAS_OPTIONS = [
  { value: "KAS", label: "Kas" },
  { value: "BANK", label: "Bank" },
] as const;

export function labelPeranJurnal(peran: string): string {
  const row = PERAN_JURNAL_KAS_OPTIONS.find((o) => o.value === peran);
  if (row) return row.label;
  if (peran === "PIUTANG") return "Piutang";
  if (peran === "HUTANG") return "Hutang";
  if (peran === "PENDAPATAN") return "Pendapatan";
  if (peran === "PEMBELIAN") return "Pembelian";
  if (peran === "PENERIMAAN_LAINNYA") return "Penerimaan lain";
  if (peran === "PENGELUARAN_LAINNYA") return "Pengeluaran lain";
  return peran;
}

export type JurnalKonfigurasi = {
  akunPiutang: string | null;
  akunHutang: string | null;
  akunPendapatan: string | null;
  akunPembelian: string | null;
  akunPenerimaanLainnya: string | null;
  akunPengeluaranLainnya: string | null;
};

export type JurnalKonfigurasiSetPayload = {
  akunPiutang: string | null;
  akunHutang: string | null;
  akunPendapatan: string | null;
  akunPembelian: string | null;
  akunPenerimaanLainnya: string | null;
  akunPengeluaranLainnya: string | null;
};

export type JurnalJenisTransaksi =
  | "PEMBELIAN"
  | "PENJUALAN"
  | "PELUNASAN_PIUTANG"
  | "PELUNASAN_HUTANG"
  | "PENERIMAAN_LAINNYA"
  | "PENGELUARAN_LAINNYA"
  | "TRANSFER";

export type JurnalUmumListRow = {
  id: number;
  tanggal: string;
  jenis: string;
  referensi: string;
  catatan: string;
  totalDebit: number;
  totalKredit: number;
};

export type JurnalTransaksiInsertPayload = {
  tanggal: string;
  jenis: JurnalJenisTransaksi | string;
  referensi: string;
  catatan: string;
  jumlah: number;
  kasKode?: string | null;
  kasSumberKode?: string | null;
  kasTargetKode?: string | null;
};
