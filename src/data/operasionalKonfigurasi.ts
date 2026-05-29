/**
 * Pengaturan operasional global — sumber kebenaran lintas modul.
 *
 * Saat ini berisi `awalPeriode` yang dipakai sebagai acuan tanggal untuk:
 *  - Saldo awal stok (semua transaksi stok dianggap mulai dari tanggal ini).
 *  - Saldo awal kas / akun keuangan (saldo per tanggal ini = saldo awal).
 *  - Pembukuan (laporan periode tidak mundur sebelum tanggal ini).
 *
 * Disimpan di backend SQLite (table `operasional_konfigurasi`, single row)
 * agar tersedia untuk seluruh command Rust dan konsisten antar PC/instans.
 */
export type OperasionalKonfigurasi = {
  /** Format YYYY-MM-DD. Null = belum diset. */
  awalPeriode: string | null;
};

export type OperasionalKonfigurasiSetPayload = {
  awalPeriode: string | null;
};

export const OPERASIONAL_KONFIGURASI_DEFAULT: OperasionalKonfigurasi = {
  awalPeriode: null,
};

/** Format ISO date (YYYY-MM-DD) ke teks lokal Indonesia (1 Mei 2026). */
export function formatTanggalLokal(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const tahun = Number(m[1]);
  const bulanIdx = Number(m[2]) - 1;
  const tanggal = Number(m[3]);
  const bulan = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  if (bulanIdx < 0 || bulanIdx > 11) return iso;
  return `${tanggal} ${bulan[bulanIdx]} ${tahun}`;
}
