import { invoke } from "@tauri-apps/api/core";
import type { KasAwalSetPayload, KasAwalSnapshot } from "@/data/kasAwal";

export function kasAwalGet() {
  return invoke<KasAwalSnapshot>("kas_awal_get");
}

export function kasAwalSet(payload: KasAwalSetPayload) {
  return invoke<KasAwalSnapshot>("kas_awal_set", { payload });
}
