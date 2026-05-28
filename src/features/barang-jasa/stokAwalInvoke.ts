import { invoke } from "@tauri-apps/api/core";
import type { StokAwalSetPayload, StokAwalSnapshot } from "@/data/stokAwal";

export function stokAwalGet() {
  return invoke<StokAwalSnapshot>("stok_awal_get");
}

export function stokAwalSet(payload: StokAwalSetPayload) {
  return invoke<StokAwalSnapshot>("stok_awal_set", { payload });
}
