import { invoke } from "@tauri-apps/api/core";
import type { NeracaSnapshot } from "@/data/keuangan";

/**
 * Ambil snapshot neraca (balance sheet) per satu tanggal cutoff
 * (format YYYY-MM-DD). Total modal sudah termasuk laba berjalan
 * period-to-date dari akun pendapatan/HPP/beban.
 */
export function neracaGet(args: { tanggal: string }) {
  return invoke<NeracaSnapshot>("neraca_get", args);
}
