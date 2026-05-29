import { invoke } from "@tauri-apps/api/core";
import type { BukuBesarSnapshot } from "@/data/keuangan";

export function bukuBesarGet(args: {
  akunKode: string;
  tanggalDari: string;
  tanggalSampai: string;
}) {
  return invoke<BukuBesarSnapshot>("buku_besar_get", args);
}
