/**
 * Persistensi pilihan "modul bisnis aktif" di localStorage.
 *
 * Disimpan sebagai array string ids agar serializable; di-load kembali
 * sebagai `Set` untuk lookup O(1) di filter sidebar dan komponen yang
 * peduli "apakah modul X aktif?".
 *
 * Sengaja di sisi UI (bukan DB) karena ini preferensi tampilan single-
 * mesin/user — server-side data tidak terpengaruh apakah modul on/off.
 */
import {
  DEFAULT_MODUL_AKTIF,
  isModulId,
  type ModulBisnisId,
} from "@/features/modul-bisnis/modulBisnisCatalog";

const STORAGE_KEY = "easybook-modul-aktif";

/** Dispatch custom event saat berubah agar hook lain bisa re-render
 *  tanpa polling. Cross-tab tetap di-handle native `storage` event. */
const CHANGE_EVENT = "easybook:modul-aktif-changed";

export function loadModulAktif(): Set<ModulBisnisId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_MODUL_AKTIF);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(DEFAULT_MODUL_AKTIF);
    const filtered = parsed.filter(
      (item): item is ModulBisnisId => typeof item === "string" && isModulId(item),
    );
    return new Set(filtered);
  } catch {
    return new Set(DEFAULT_MODUL_AKTIF);
  }
}

export function saveModulAktif(set: ReadonlySet<ModulBisnisId>): void {
  try {
    const arr = Array.from(set);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Storage penuh / mode privasi — abaikan; UI tetap pakai
    // default in-memory.
  }
}

export function clearModulAktif(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export const MODUL_AKTIF_CHANGE_EVENT = CHANGE_EVENT;
export const MODUL_AKTIF_STORAGE_KEY = STORAGE_KEY;
