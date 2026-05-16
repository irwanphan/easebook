/** Baris daftar akun (chart of accounts). */
export type AkunKeuanganRow = {
  kode: string;
  nama: string;
  indukKode: string | null;
  indukNama: string | null;
  /** Kelompok besar (AKTIVA_LANCAR, PENDAPATAN, …). */
  kelompok: string;
  /** Kolom normal: D (debit) atau K (kredit). */
  kolomNorm: string;
  /** Kosong jika tidak dipakai di laba rugi. */
  kelompokLr: string;
  /** Sub kategori pendapatan/biaya (opsional). */
  subKelompok: string;
  isAkunKas: boolean;
  /** Saldo kas; hanya berarti untuk akun yang ditandai akun kas. */
  saldo: number;
};

export type AkunKeuanganInsertPayload = {
  kode: string;
  nama: string;
  indukKode?: string | null;
  kelompok?: string | null;
  kolomNorm?: string | null;
  kelompokLr?: string | null;
  subKelompok?: string | null;
  isAkunKas: boolean;
};

export type AkunKeuanganUpdatePayload = {
  kode: string;
  nama: string;
  indukKode?: string | null;
  kelompok?: string | null;
  kolomNorm?: string | null;
  kelompokLr?: string | null;
  subKelompok?: string | null;
  isAkunKas: boolean;
};

/** Kelompok besar daftar akun (urutan tampilan). */
export const KELOMPOK_AKUN = [
  { value: "AKTIVA_LANCAR", label: "Aktiva lancar" },
  { value: "AKTIVA_TETAP", label: "Aktiva tetap" },
  { value: "HUTANG_LANCAR", label: "Hutang lancar" },
  { value: "HUTANG_JANGKA_PANJANG", label: "Hutang jangka panjang" },
  { value: "MODAL", label: "Modal" },
  { value: "PENDAPATAN", label: "Pendapatan" },
  { value: "BIAYA", label: "Biaya" },
] as const;

export const KOLOM_NORM = [
  { value: "D", label: "Debit (D)" },
  { value: "K", label: "Kredit (K)" },
] as const;

/** Kelompok laba rugi (opsional). */
export const KELOMPOK_LABA_RUGI = [
  { value: "", label: "— Tidak dipakai di laba rugi —" },
  { value: "PENDAPATAN", label: "Pendapatan" },
  { value: "HPP", label: "Harga pokok penjualan (HPP)" },
  { value: "BEBAN", label: "Beban / biaya" },
] as const;

export function labelKelompokAkun(kelompok: string): string {
  const row = KELOMPOK_AKUN.find((o) => o.value === kelompok);
  return row?.label ?? (kelompok || "—");
}

export function labelKelompokLr(kelompok: string): string {
  const row = KELOMPOK_LABA_RUGI.find((o) => o.value === kelompok);
  return row?.label ?? "—";
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
  | "PEMBELIAN_TUNAI"
  | "PENJUALAN"
  | "PELUNASAN_PIUTANG"
  | "PELUNASAN_HUTANG"
  | "PENERIMAAN_LAINNYA"
  | "PENGELUARAN_LAINNYA"
  | "TRANSFER";

/** Satu baris debit atau kredit dalam jurnal umum. */
export type JurnalUmumListRow = {
  lineId: number;
  jurnalId: number;
  tanggal: string;
  jenis: string;
  referensi: string;
  catatan: string;
  akunKode: string;
  akunNama: string;
  debit: number;
  kredit: number;
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
