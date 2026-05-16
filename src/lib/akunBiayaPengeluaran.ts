import type { AkunKeuanganRow } from "@/data/keuangan";

/** Akun yang boleh dipilih sebagai baris biaya pada form pengeluaran. */
export function isAkunBiayaPengeluaran(row: AkunKeuanganRow): boolean {
  if (row.isAkunKas) return false;
  const kelompok = row.kelompok.toUpperCase();
  const lr = row.kelompokLr.toUpperCase();
  return kelompok === "BIAYA" || lr === "BEBAN" || lr === "HPP";
}

export function filterAkunBiayaPengeluaran(rows: AkunKeuanganRow[]): AkunKeuanganRow[] {
  return rows
    .filter(isAkunBiayaPengeluaran)
    .sort((a, b) => a.kode.localeCompare(b.kode, undefined, { numeric: true }));
}
