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

export type PembelianDetailLine = {
  barangKode: string;
  barangNama: string;
  qty: number;
  hargaSatuan: number;
  subtotal: number;
};

export type PembelianDetail = {
  nomor: string;
  pemasokKode: string;
  pemasokNama: string;
  gudangKode: string;
  gudangNama: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  metodePembayaran: string;
  total: number;
  status: string;
  lines: PembelianDetailLine[];
};
