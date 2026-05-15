/** Baris daftar akun (chart of accounts). */
export type AkunKeuanganRow = {
  kode: string;
  nama: string;
  indukKode: string | null;
  indukNama: string | null;
  /** Kosong jika tidak dipakai di laba rugi. */
  kelompokLr: string;
  isAkunKas: boolean;
  /** Saldo kas; hanya berarti untuk akun yang ditandai akun kas. */
  saldo: number;
};

export type AkunKeuanganInsertPayload = {
  kode: string;
  nama: string;
  indukKode?: string | null;
  kelompokLr?: string | null;
  isAkunKas: boolean;
};

/** Kelompok laba rugi (opsional). */
export const KELOMPOK_LABA_RUGI = [
  { value: "", label: "— Tidak dipakai di laba rugi —" },
  { value: "PENDAPATAN", label: "Pendapatan" },
  { value: "HPP", label: "Harga pokok penjualan (HPP)" },
  { value: "BEBAN", label: "Beban / biaya" },
] as const;

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
