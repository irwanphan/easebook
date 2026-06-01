/**
 * Filter sidebar berdasarkan modul bisnis yang aktif.
 *
 * Aturan:
 *  - Untuk setiap modul yang **tidak aktif**, kumpulkan id NavLink &
 *    NavSubItem yang perlu disembunyikan dari `MODUL_CATALOG`.
 *  - Untuk NavGroup, child di-filter; bila semua child tersembunyi,
 *    group itu sendiri ikut tersembunyi (tidak menampilkan group kosong).
 *  - Fungsi ini **pure**; aman dipanggil setiap render.
 *
 * Tidak menghapus rute (router tetap accessible via URL langsung —
 * onboarding gate dll. yang menjaga akses); hanya menyembunyikan dari
 * sidebar agar tampilan tetap ringkas.
 */
import type {
  NavGroupEntry,
  NavSubItem,
  PrimaryNavEntry,
} from "@/config/navigation";
import {
  MODUL_CATALOG,
  type ModulBisnisId,
} from "@/features/modul-bisnis/modulBisnisCatalog";

type HiddenIds = {
  entries: Set<string>;
  subItems: Set<string>;
};

function buildHiddenIds(aktif: ReadonlySet<ModulBisnisId>): HiddenIds {
  const entries = new Set<string>();
  const subItems = new Set<string>();
  for (const modul of MODUL_CATALOG) {
    if (aktif.has(modul.id)) continue;
    for (const id of modul.navEntryIds) entries.add(id);
    for (const id of modul.navSubItemIds) subItems.add(id);
  }
  return { entries, subItems };
}

export function filterNavByModul(
  items: PrimaryNavEntry[],
  aktif: ReadonlySet<ModulBisnisId>,
): PrimaryNavEntry[] {
  // Cepat keluar bila semua modul aktif (default) — tidak ada filter.
  if (MODUL_CATALOG.every((m) => aktif.has(m.id))) return items;

  const hidden = buildHiddenIds(aktif);
  const result: PrimaryNavEntry[] = [];

  for (const item of items) {
    if (item.kind === "link") {
      if (hidden.entries.has(item.id)) continue;
      result.push(item);
      continue;
    }
    if (item.kind === "group") {
      if (hidden.entries.has(item.id)) continue;
      const children: NavSubItem[] = item.children.filter(
        (c) => !hidden.subItems.has(c.id),
      );
      // Group kosong = jangan ditampilkan (tidak ada child).
      if (children.length === 0) continue;
      const next: NavGroupEntry = { ...item, children };
      result.push(next);
    }
  }
  return result;
}
