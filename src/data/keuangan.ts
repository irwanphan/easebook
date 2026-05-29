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
  /** Akun lawan untuk semua jurnal pembuka (saldo awal kas, stok, dll.)
   *  yang tanggalnya = `operasional_konfigurasi.awal_periode`. */
  akunHistoricalBalance: string | null;
};

export type JurnalKonfigurasiSetPayload = {
  akunPiutang: string | null;
  akunHutang: string | null;
  akunPendapatan: string | null;
  akunPembelian: string | null;
  akunPenerimaanLainnya: string | null;
  akunPengeluaranLainnya: string | null;
  akunHistoricalBalance: string | null;
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

export type JurnalManualLinePayload = {
  akunKode: string;
  debit: number;
  kredit: number;
  catatan: string;
};

export type JurnalManualInsertPayload = {
  tanggal: string;
  referensi: string;
  catatan: string;
  lines: JurnalManualLinePayload[];
};

/** Satu baris mutasi di buku besar (general ledger) + saldo running. */
export type BukuBesarRow = {
  lineId: number;
  jurnalId: number;
  tanggal: string;
  jenis: string;
  referensi: string;
  catatan: string;
  debit: number;
  kredit: number;
  /**
   * Saldo kumulatif setelah baris ini, dalam basis natural akun (positif =
   * sisi normal). Untuk `kolomNorm = "D"`, ini = Σ debit − Σ kredit kumulatif.
   * Untuk `kolomNorm = "K"`, ini = Σ kredit − Σ debit kumulatif.
   */
  saldoRunning: number;
};

/** Seksi pada laporan laba rugi. */
export type LabaRugiSeksi = "PENDAPATAN" | "HPP" | "BEBAN";

export function labelLabaRugiSeksi(seksi: string): string {
  if (seksi === "PENDAPATAN") return "Pendapatan";
  if (seksi === "HPP") return "Harga pokok penjualan";
  if (seksi === "BEBAN") return "Beban operasional";
  return seksi || "—";
}

/** Satu baris akun di laporan laba rugi. */
export type LabaRugiAkunRow = {
  akunKode: string;
  akunNama: string;
  /** Kelompok besar akun (mis. PENDAPATAN, BIAYA). */
  kelompok: string;
  /** Kelompok khusus laba rugi bila di-set (PENDAPATAN/HPP/BEBAN). */
  kelompokLr: string;
  subKelompok: string;
  totalDebit: number;
  totalKredit: number;
  /**
   * Nilai natural per seksi:
   * - PENDAPATAN: kredit − debit.
   * - HPP / BEBAN: debit − kredit.
   */
  nilai: number;
  seksi: LabaRugiSeksi | string;
};

/** Snapshot laporan laba rugi untuk satu rentang tanggal. */
export type LabaRugiSnapshot = {
  tanggalDari: string;
  tanggalSampai: string;
  akun: LabaRugiAkunRow[];
  totalPendapatan: number;
  totalHpp: number;
  /** = totalPendapatan − totalHpp. */
  labaKotor: number;
  totalBeban: number;
  /** = labaKotor − totalBeban. */
  labaBersih: number;
};

/** Seksi pada laporan neraca. */
export type NeracaSeksi =
  | "AKTIVA_LANCAR"
  | "AKTIVA_TETAP"
  | "HUTANG_LANCAR"
  | "HUTANG_JANGKA_PANJANG"
  | "MODAL";

/** Satu baris akun pada laporan neraca (saldo natural per tanggal cutoff). */
export type NeracaAkunRow = {
  akunKode: string;
  akunNama: string;
  kelompok: string;
  /** "D" atau "K" — sisi normal akun. */
  kolomNorm: string;
  totalDebit: number;
  totalKredit: number;
  /** Saldo natural pada cutoff (positif = sisi normal akun). */
  saldo: number;
};

/** Snapshot laporan neraca (balance sheet) per satu tanggal cutoff. */
export type NeracaSnapshot = {
  tanggal: string;
  aktivaLancar: NeracaAkunRow[];
  aktivaTetap: NeracaAkunRow[];
  hutangLancar: NeracaAkunRow[];
  hutangJangkaPanjang: NeracaAkunRow[];
  modal: NeracaAkunRow[];
  totalAktivaLancar: number;
  totalAktivaTetap: number;
  totalAktiva: number;
  totalHutangLancar: number;
  totalHutangJangkaPanjang: number;
  totalHutang: number;
  /** Jumlah saldo akun-akun MODAL yang tercatat di jurnal. */
  totalModalTercatat: number;
  /**
   * Laba (positif) / rugi (negatif) berjalan periode-to-date, dihitung dari
   * mutasi akun pendapatan/HPP/beban sampai dengan `tanggal`.
   */
  labaBerjalan: number;
  /** = totalModalTercatat + labaBerjalan. */
  totalModal: number;
  /** = totalHutang + totalModal. */
  totalPasiva: number;
  /** totalAktiva − totalPasiva. Idealnya 0. */
  selisih: number;
};

/** Seksi pada laporan arus kas (metode langsung, sesuai PSAK 2). */
export type ArusKasSeksi = "OPERASI" | "INVESTASI" | "PENDANAAN";

export function labelArusKasSeksi(seksi: string): string {
  if (seksi === "OPERASI") return "Aktivitas operasi";
  if (seksi === "INVESTASI") return "Aktivitas investasi";
  if (seksi === "PENDANAAN") return "Aktivitas pendanaan";
  return seksi || "—";
}

/** Satu baris akun lawan kas (non-kas) pada laporan arus kas. */
export type ArusKasAkunRow = {
  akunKode: string;
  akunNama: string;
  /** Kelompok besar akun (AKTIVA_LANCAR, BIAYA, dst.). */
  kelompok: string;
  seksi: ArusKasSeksi | string;
  kasMasuk: number;
  kasKeluar: number;
  /** = kasMasuk − kasKeluar. Positif: akun ini menambah kas neto. */
  net: number;
};

/** Rincian saldo per akun kas (KAS TUNAI, BCA, dll.) pada periode. */
export type ArusKasSaldoKasRow = {
  akunKode: string;
  akunNama: string;
  saldoAwal: number;
  kasMasuk: number;
  kasKeluar: number;
  saldoAkhir: number;
};

/**
 * Snapshot Laporan Arus Kas — Metode Langsung (Direct Method).
 *
 * Total perubahan kas (`netPerubahanKas`) dihitung dari distribusi akun lawan
 * kas. `saldoKasAkhir` dihitung independen dari mutasi akun kas langsung.
 * Selisih keduanya tercatat di `selisihRekonsiliasi` — idealnya 0.
 */
export type ArusKasSnapshot = {
  tanggalDari: string;
  tanggalSampai: string;

  saldoKasAwal: number;
  saldoKasAkhir: number;

  akunOperasi: ArusKasAkunRow[];
  akunInvestasi: ArusKasAkunRow[];
  akunPendanaan: ArusKasAkunRow[];

  kasMasukOperasi: number;
  kasKeluarOperasi: number;
  netOperasi: number;

  kasMasukInvestasi: number;
  kasKeluarInvestasi: number;
  netInvestasi: number;

  kasMasukPendanaan: number;
  kasKeluarPendanaan: number;
  netPendanaan: number;

  totalKasMasuk: number;
  totalKasKeluar: number;
  /** = netOperasi + netInvestasi + netPendanaan. */
  netPerubahanKas: number;

  /** = saldoKasAwal + netPerubahanKas. Idealnya = saldoKasAkhir. */
  saldoKasAkhirProyeksi: number;
  /** = saldoKasAkhir − saldoKasAkhirProyeksi. Idealnya 0. */
  selisihRekonsiliasi: number;

  saldoPerKas: ArusKasSaldoKasRow[];
};

/** Snapshot buku besar untuk satu akun pada rentang tanggal tertentu. */
export type BukuBesarSnapshot = {
  akunKode: string;
  akunNama: string;
  kelompok: string;
  /** "D" atau "K" — arah saldo natural akun. */
  kolomNorm: string;
  tanggalDari: string;
  tanggalSampai: string;
  /** Saldo akun per awal `tanggalDari` (sebelum hari pertama), basis natural. */
  saldoAwal: number;
  totalDebit: number;
  totalKredit: number;
  /** Saldo akhir = saldoAwal + Σ delta natural, basis natural. */
  saldoAkhir: number;
  entries: BukuBesarRow[];
};
