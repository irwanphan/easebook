export type BarangSaldoGudangRow = {
  kode: string;
  nama: string;
  satuan: string;
  saldo: number;
};

export type MutasiAntarGudangLinePayload = {
  barangKode: string;
  qty: number;
};

export type MutasiAntarGudangPayload = {
  gudangAsal: string;
  gudangTujuan: string;
  tanggal: string;
  catatan: string;
  lines: MutasiAntarGudangLinePayload[];
};
