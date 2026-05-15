/** Baris daftar faktur pembelian (API `pembelian_list`). */
export type PembelianListRow = {
  nomor: string;
  tanggalFaktur: string;
  pemasokNama: string;
  total: number;
  status: string;
};

export const METODE_PEMBAYARAN_PEMBELIAN = [
  { value: "TUNAI", label: "Tunai" },
  { value: "TRANSFER", label: "Transfer bank" },
  { value: "CEK", label: "Cek / giro" },
  { value: "KREDIT", label: "Kredit (hutang dagang)" },
  { value: "LAINNYA", label: "Lainnya" },
] as const;

export type MetodePembayaranPembelian = (typeof METODE_PEMBAYARAN_PEMBELIAN)[number]["value"];

export function labelMetodePembayaran(code: string): string {
  const row = METODE_PEMBAYARAN_PEMBELIAN.find((m) => m.value === code);
  return row?.label ?? code;
}
