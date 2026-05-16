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
  /** Diskon nominal per satuan (Rp). */
  diskon: number;
  subtotal: number;
};

/** Subtotal baris: qty × (harga satuan − diskon per satuan). */
export function pembelianLineSubtotal(qty: number, hargaSatuan: number, diskon: number): number {
  const q = Math.max(0, Math.floor(qty));
  const h = Math.max(0, hargaSatuan);
  const d = Math.max(0, Math.min(Math.round(diskon), h));
  return q * Math.max(0, h - d);
}

/** Total faktur: subtotal barang − diskon faktur + pajak. */
export function pembelianFakturTotal(
  subtotalBarang: number,
  diskonFaktur: number,
  pajak: number,
): number {
  const sub = Math.max(0, Math.round(subtotalBarang));
  const diskon = Math.min(Math.max(0, Math.round(diskonFaktur)), sub);
  const tax = Math.max(0, Math.round(pajak));
  return Math.max(0, sub - diskon + tax);
}

export type PembelianDetail = {
  nomor: string;
  pemasokKode: string;
  pemasokNama: string;
  gudangKode: string;
  gudangNama: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  metodePembayaran: string;
  subtotalBarang: number;
  diskonFaktur: number;
  pajak: number;
  total: number;
  status: string;
  lines: PembelianDetailLine[];
};
