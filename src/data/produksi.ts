export type ProduksiStatus = "Menunggu" | "Selesai" | "Dibatalkan";

export type ProduksiLineInput = {
  barangKode: string;
  qty: number;
  satuanTingkat: number;
  hppPerUnit: number;
  catatan: string;
};

export type ProduksiInsertPayload = {
  tanggal: string;
  gudangBbKode: string;
  gudangHasilKode: string;
  statusSelesai: boolean;
  biayaProduksi: number;
  akunBiayaKode: string | null;
  catatan: string;
  dibuatOleh: string;
  bahanBaku: ProduksiLineInput[];
  hasil: ProduksiLineInput[];
};

export type ProduksiListRow = {
  nomor: string;
  tanggal: string;
  gudangBbKode: string;
  gudangBbNama: string;
  gudangHasilKode: string;
  gudangHasilNama: string;
  status: ProduksiStatus;
  biayaProduksi: number;
  totalNilaiBb: number;
  totalNilaiHasil: number;
  jumlahBahan: number;
  jumlahHasil: number;
  catatan: string;
  dibuatOleh: string;
  tanggalSelesai: string | null;
};

export type ProduksiLineRow = {
  id: number;
  barangKode: string;
  barangNama: string;
  satuanTingkat: number;
  satuanNama: string;
  qty: number;
  hppPerUnit: number;
  subtotalNilai: number;
  catatan: string;
};

export type ProduksiDetail = {
  nomor: string;
  tanggal: string;
  gudangBbKode: string;
  gudangBbNama: string;
  gudangHasilKode: string;
  gudangHasilNama: string;
  status: ProduksiStatus;
  biayaProduksi: number;
  akunBiayaKode: string | null;
  akunBiayaNama: string | null;
  catatan: string;
  dibuatOleh: string;
  jurnalId: number | null;
  tanggalSelesai: string | null;
  createdAt: number;
  updatedAt: number;
  bahanBaku: ProduksiLineRow[];
  hasil: ProduksiLineRow[];
  totalNilaiBb: number;
  totalNilaiHasil: number;
  selisih: number;
};

export type ProduksiHppSnapshot = {
  kode: string;
  nama: string;
  satuan: string;
  tipe: string;
  stokGlobal: number;
  hppPerUnit: number;
};

export const PRODUKSI_STATUS_OPTIONS: ProduksiStatus[] = [
  "Menunggu",
  "Selesai",
  "Dibatalkan",
];
