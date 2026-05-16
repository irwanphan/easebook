/** Faktur pembelian hutang yang belum dilunasi (API `hutang_belum_lunas_list`). */
export type HutangBelumLunasRow = {
  nomor: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  pemasokKode: string;
  pemasokNama: string;
  total: number;
  metodePembayaran: string;
};

export type PelunasanHutangBatchPayload = {
  pemasokKode: string;
  tanggal: string;
  kasKode: string;
  catatan: string;
  nomorFaktur: string[];
};

export type BuatPelunasanHutangLocationState = {
  pemasokKode?: string;
  preselectNomor?: string[];
};
