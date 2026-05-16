/** Faktur penjualan piutang yang belum dilunasi (API `piutang_belum_lunas_list`). */
export type PiutangBelumLunasRow = {
  nomor: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  pelangganKode: string;
  pelangganNama: string;
  total: number;
  catatanFaktur: string;
};

export type PelunasanPiutangPayload = {
  nomorFaktur: string;
  tanggal: string;
  kasKode: string;
  jumlah: number;
  catatan: string;
};

export type PelunasanPiutangBatchPayload = {
  pelangganKode: string;
  tanggal: string;
  kasKode: string;
  catatan: string;
  nomorFaktur: string[];
};

export type BuatPelunasanPiutangLocationState = {
  pelangganKode?: string;
  preselectNomor?: string[];
};
