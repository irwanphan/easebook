/**
 * Hook untuk membaca set modul bisnis yang aktif saat ini.
 *
 * Mengikuti perubahan dari:
 *  - same-tab: custom event `MODUL_AKTIF_CHANGE_EVENT` (dipancarkan
 *    saat `saveModulAktif`/`clearModulAktif` dipanggil).
 *  - cross-tab: native `storage` event browser.
 *
 * Re-render dipicu otomatis sehingga sidebar dan UI lain bisa adapt
 * tanpa polling atau prop-drilling.
 */
import { useEffect, useState } from "react";
import {
  loadModulAktif,
  MODUL_AKTIF_CHANGE_EVENT,
  MODUL_AKTIF_STORAGE_KEY,
} from "@/features/modul-bisnis/modulBisnisStorage";
import type { ModulBisnisId } from "@/features/modul-bisnis/modulBisnisCatalog";

export function useModulAktif(): Set<ModulBisnisId> {
  const [aktif, setAktif] = useState<Set<ModulBisnisId>>(() => loadModulAktif());

  useEffect(() => {
    function reload() {
      setAktif(loadModulAktif());
    }
    function onStorage(ev: StorageEvent) {
      if (ev.key === null || ev.key === MODUL_AKTIF_STORAGE_KEY) reload();
    }
    window.addEventListener(MODUL_AKTIF_CHANGE_EVENT, reload);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MODUL_AKTIF_CHANGE_EVENT, reload);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return aktif;
}
