import { invoke } from "@tauri-apps/api/core";
import type {
  LaporanPembelianSnapshot,
  LaporanPenjualanSnapshot,
} from "@/data/laporanTransaksi";

/**
 * Ambil snapshot Laporan Penjualan multi-dimensi untuk rentang
 * `[tanggalDari, tanggalSampai]` (inklusif, format YYYY-MM-DD).
 *
 * Faktur ber-status `Dibatalkan` dikecualikan secara otomatis.
 */
export function laporanPenjualanGet(args: {
  tanggalDari: string;
  tanggalSampai: string;
}) {
  return invoke<LaporanPenjualanSnapshot>("laporan_penjualan_get", args);
}

/**
 * Ambil snapshot Laporan Pembelian multi-dimensi untuk rentang
 * `[tanggalDari, tanggalSampai]` (inklusif, format YYYY-MM-DD).
 *
 * Faktur ber-status `Dibatalkan` dikecualikan secara otomatis.
 */
export function laporanPembelianGet(args: {
  tanggalDari: string;
  tanggalSampai: string;
}) {
  return invoke<LaporanPembelianSnapshot>("laporan_pembelian_get", args);
}
