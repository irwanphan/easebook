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

export type PelunasanHutangPayload = {
  nomorFaktur: string;
  tanggal: string;
  kasKode: string;
  jumlah: number;
  catatan: string;
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

export type PelunasanHutangRiwayatRow = {
  nomor: string;
  tanggal: string;
  pemasokKode: string;
  pemasokNama: string;
  akunKasKode: string;
  akunKasNama: string;
  total: number;
  jumlahFaktur: number;
  catatan: string;
  createdAt: number;
};

export type PelunasanHutangFakturRow = {
  fakturNomor: string;
  tanggalFaktur: string;
  jatuhTempo: string;
  jumlah: number;
};

export type PelunasanHutangDetail = {
  nomor: string;
  tanggal: string;
  pemasokKode: string;
  pemasokNama: string;
  akunKasKode: string;
  akunKasNama: string;
  total: number;
  catatan: string;
  createdAt: number;
  jurnalId: number | null;
  faktur: PelunasanHutangFakturRow[];
};

/**
 * Payload untuk `pelunasan_hutang_update`. Faktur tetap (tidak bisa diubah dari
 * halaman edit) — yang bisa diubah hanya tanggal, kas pembayaran, dan catatan.
 * Backend akan membuat jurnal pembalik untuk jurnal lama, lalu memasang jurnal
 * baru dengan nilai terbaru sehingga audit trail tetap lengkap.
 */
export type PelunasanHutangUpdatePayload = {
  tanggal: string;
  kasKode: string;
  catatan: string;
  actorUsername?: string;
  actorNama?: string;
};
