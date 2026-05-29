import { invoke } from "@tauri-apps/api/core";
import type { ArusKasSnapshot } from "@/data/keuangan";

/**
 * Ambil snapshot Laporan Arus Kas (Cash Flow Statement) — Metode Langsung —
 * untuk rentang `[tanggalDari, tanggalSampai]` (inklusif, format YYYY-MM-DD).
 *
 * Distribusi per kategori (Operasi/Investasi/Pendanaan) dihitung dari akun
 * lawan kas. Saldo kas awal & akhir dihitung independen dari mutasi langsung
 * akun kas, dengan `selisihRekonsiliasi` sebagai tanda integritas data.
 */
export function arusKasGet(args: {
  tanggalDari: string;
  tanggalSampai: string;
}) {
  return invoke<ArusKasSnapshot>("arus_kas_get", args);
}
