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
  hargaSatuan: number;
  catatan: string;
};

export type PenjualanInsertPayload = {
  pelangganKode: string;
  gudangKode: string;
  salesman: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  catatanFaktur: string;
  lines: PenjualanLineInput[];
};
