export type PenerimaanListRow = {
  nomor: string;
  tanggal: string;
  akunKasKode: string;
  akunKasNama: string;
  total: number;
  catatan: string;
  jumlahBaris: number;
};

export type PenerimaanLineInput = {
  akunKode: string;
  jumlah: number;
  catatan: string;
};

export type PenerimaanInsertPayload = {
  tanggal: string;
  kasKode: string;
  catatan: string;
  lines: PenerimaanLineInput[];
};
