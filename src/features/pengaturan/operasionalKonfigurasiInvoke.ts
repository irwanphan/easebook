import { invoke } from "@tauri-apps/api/core";
import type {
  OperasionalKonfigurasi,
  OperasionalKonfigurasiSetPayload,
} from "@/data/operasionalKonfigurasi";

export function operasionalKonfigurasiGet() {
  return invoke<OperasionalKonfigurasi>("operasional_konfigurasi_get");
}

export function operasionalKonfigurasiSet(payload: OperasionalKonfigurasiSetPayload) {
  return invoke<OperasionalKonfigurasi>("operasional_konfigurasi_set", { payload });
}
