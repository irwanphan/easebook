/** Satu baris di daftar transfer kas (command `transfer_kas_list`). */
export type TransferKasListRow = {
  nomor: string;
  tanggal: string;
  akunSumberKode: string;
  akunSumberNama: string;
  akunTujuanKode: string;
  akunTujuanNama: string;
  nominalKirim: number;
  nominalTerima: number;
  biayaTransfer: number;
  akunBiayaKode: string | null;
  akunBiayaNama: string | null;
  catatan: string;
};

/** Payload `transfer_kas_insert` / `transfer_kas_update`. */
export type TransferKasInsertPayload = {
  tanggal: string;
  akunSumberKode: string;
  akunTujuanKode: string;
  nominalKirim: number;
  nominalTerima: number;
  biayaTransfer: number;
  akunBiayaKode: string | null;
  catatan: string;
  actorUsername: string;
  actorNama: string;
};

/** Detail satu transfer (command `transfer_kas_detail`). */
export type TransferKasDetail = {
  nomor: string;
  tanggal: string;
  akunSumberKode: string;
  akunSumberNama: string;
  akunTujuanKode: string;
  akunTujuanNama: string;
  nominalKirim: number;
  nominalTerima: number;
  biayaTransfer: number;
  akunBiayaKode: string | null;
  akunBiayaNama: string | null;
  catatan: string;
  jurnalId: number | null;
  createdAt: number;
  updatedAt: number;
};
