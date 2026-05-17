import type { AkunKeuanganRow } from "@/data/keuangan";

/** Akun yang boleh dipilih sebagai baris penerimaan pada form penerimaan. */
export function isAkunPenerimaan(row: AkunKeuanganRow): boolean {
  if (row.isAkunKas) return false;
  const kelompok = row.kelompok.toUpperCase();
  const lr = row.kelompokLr.toUpperCase();
  return kelompok === "PENDAPATAN" || lr === "PENDAPATAN";
}

export function filterAkunPenerimaan(rows: AkunKeuanganRow[]): AkunKeuanganRow[] {
  return rows
    .filter(isAkunPenerimaan)
    .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
}
