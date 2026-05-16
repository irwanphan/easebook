export type PengeluaranListRow = {
  nomor: string;
  tanggal: string;
  akunKasKode: string;
  akunKasNama: string;
  total: number;
  catatan: string;
  jumlahBaris: number;
};

export type PengeluaranLineInput = {
  akunKode: string;
  jumlah: number;
  catatan: string;
};

export type PengeluaranInsertPayload = {
  tanggal: string;
  kasKode: string;
  catatan: string;
  lines: PengeluaranLineInput[];
};
