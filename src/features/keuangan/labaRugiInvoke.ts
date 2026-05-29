import { invoke } from "@tauri-apps/api/core";
import type { LabaRugiSnapshot } from "@/data/keuangan";

export function labaRugiGet(args: {
  tanggalDari: string;
  tanggalSampai: string;
}) {
  return invoke<LabaRugiSnapshot>("laba_rugi_get", args);
}
