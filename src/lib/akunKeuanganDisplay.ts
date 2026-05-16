import type { AkunKeuanganRow } from "@/data/keuangan";
import { KELOMPOK_AKUN, labelKelompokAkun } from "@/data/keuangan";

export type AkunRowWithDepth = AkunKeuanganRow & { depth: number };

export type AkunKelompokSection = {
  kelompok: string;
  label: string;
  rows: AkunRowWithDepth[];
};

function normKode(kode: string) {
  return kode.trim().toUpperCase();
}

/** Kedalaman indent: 0 = akun utama, 1+ = anak (berdasarkan rantai induk). */
export function computeAkunDepth(rows: AkunKeuanganRow[]): Map<string, number> {
  const byKode = new Map(rows.map((r) => [normKode(r.kode), r]));
  const cache = new Map<string, number>();

  function depthFor(kode: string): number {
    const key = normKode(kode);
    if (cache.has(key)) return cache.get(key)!;
    const row = byKode.get(key);
    if (!row?.indukKode?.trim()) {
      cache.set(key, 0);
      return 0;
    }
    const parent = normKode(row.indukKode);
    if (!byKode.has(parent) || parent === key) {
      cache.set(key, 0);
      return 0;
    }
    const d = depthFor(parent) + 1;
    cache.set(key, d);
    return d;
  }

  for (const r of rows) depthFor(r.kode);
  return cache;
}

export function groupAkunByKelompok(rows: AkunKeuanganRow[]): AkunKelompokSection[] {
  const depths = computeAkunDepth(rows);
  const withDepth: AkunRowWithDepth[] = rows.map((r) => ({
    ...r,
    depth: depths.get(normKode(r.kode)) ?? 0,
  }));

  const order = KELOMPOK_AKUN.map((k) => k.value);
  const buckets = new Map<string, AkunRowWithDepth[]>();

  for (const r of withDepth) {
    const key = r.kelompok?.trim() || "_LAIN";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }

  const sections: AkunKelompokSection[] = [];

  for (const k of order) {
    const list = buckets.get(k);
    if (!list?.length) continue;
    sections.push({ kelompok: k, label: labelKelompokAkun(k), rows: list });
    buckets.delete(k);
  }

  for (const [k, list] of buckets) {
    if (!list.length) continue;
    sections.push({
      kelompok: k,
      label: k === "_LAIN" ? "Lainnya" : labelKelompokAkun(k),
      rows: list,
    });
  }

  return sections;
}
