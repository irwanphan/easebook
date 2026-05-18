/** Baris daftar faktur penjualan (API `penjualan_list`). */
export type PenjualanListRow = {
  nomor: string;
  tanggalFaktur: string;
  pelangganNama: string;
  salesman: string;
  total: number;
  status: string;
};

export type PenjualanLineInput = {
  barangKode: string;
  qty: number;
  satuanTingkat: number;
  hargaSatuan: number;
  /** Diskon nominal per satuan (Rp). */
  diskon: number;
  catatan: string;
};

/** Subtotal baris: qty × (harga satuan − diskon per satuan). */
export function penjualanLineSubtotal(qty: number, hargaSatuan: number, diskon: number): number {
  const q = Math.max(0, Math.floor(qty));
  const h = Math.max(0, hargaSatuan);
  const d = Math.max(0, Math.min(Math.round(diskon), h));
  return q * Math.max(0, h - d);
}

/** Pajak PPN: (subtotal barang − diskon faktur) × tarif%. */
export function penjualanHitungPajakPpn(
  subtotalBarang: number,
  diskonFaktur: number,
  ppnPersen: number,
): number {
  const sub = Math.max(0, Math.round(subtotalBarang));
  const diskon = Math.min(Math.max(0, Math.round(diskonFaktur)), sub);
  const dasar = sub - diskon;
  const rate = Math.min(100, Math.max(0, ppnPersen));
  return Math.round((dasar * rate) / 100);
}

/** Total faktur: subtotal barang − diskon faktur + pajak. */
export function penjualanFakturTotal(
  subtotalBarang: number,
  diskonFaktur: number,
  pajak: number,
): number {
  const sub = Math.max(0, Math.round(subtotalBarang));
  const diskon = Math.min(Math.max(0, Math.round(diskonFaktur)), sub);
  const tax = Math.max(0, Math.round(pajak));
  return Math.max(0, sub - diskon + tax);
}

export type PenjualanDetailLine = {
  barangKode: string;
  barangNama: string;
  qty: number;
  satuanTingkat: number;
  satuanNama: string;
  hargaSatuan: number;
  diskon: number;
  subtotal: number;
  catatan: string;
};

export type PenjualanDetail = {
  nomor: string;
  pelangganKode: string;
  pelangganNama: string;
  gudangKode: string;
  gudangNama: string;
  salesman: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  catatanFaktur: string;
  subtotalBarang: number;
  diskonFaktur: number;
  pajak: number;
  akunKasKode: string | null;
  akunKasNama: string | null;
  total: number;
  status: string;
  lines: PenjualanDetailLine[];
};

export type PenjualanInsertPayload = {
  pelangganKode: string;
  gudangKode: string;
  salesman: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  catatanFaktur: string;
  diskonFaktur: number;
  pajak: number;
  /** Kosong = piutang (kredit). */
  akunKasKode?: string | null;
  lines: PenjualanLineInput[];
};
