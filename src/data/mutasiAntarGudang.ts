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

export type MutasiAntarGudangBarisRow = {
  barangKode: string;
  barangNama: string;
  satuan: string;
  qty: number;
};

export type MutasiAntarGudangRiwayatRow = {
  referensi: string;
  tanggal: string;
  gudangAsalKode: string;
  gudangAsalNama: string;
  gudangTujuanKode: string;
  gudangTujuanNama: string;
  catatan: string;
  jumlahBarang: number;
  totalQty: number;
  createdAt: number;
  baris: MutasiAntarGudangBarisRow[];
};

export type MutasiAntarGudangDetail = {
  referensi: string;
  tanggal: string;
  gudangAsalKode: string;
  gudangAsalNama: string;
  gudangTujuanKode: string;
  gudangTujuanNama: string;
  catatan: string;
  totalQty: number;
  createdAt: number;
  baris: MutasiAntarGudangBarisRow[];
};
