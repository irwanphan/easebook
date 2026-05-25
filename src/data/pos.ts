export type PosMetodeBayar = {
  kode: string;
  nama: string;
  akunKasKode: string;
  akunKasNama: string;
  urutan: number;
  isTunai: boolean;
  aktif: boolean;
};

export type PosShift = {
  id: number;
  kode: string;
  kasirUsername: string;
  kasirNama: string;
  gudangKode: string;
  gudangNama: string;
  modalAwal: number;
  uangAkhirAktual: number | null;
  uangAkhirEkspektasi: number | null;
  selisih: number | null;
  catatan: string;
  status: "Open" | "Closed";
  mulaiTs: number;
  selesaiTs: number | null;
};

export type PosShiftRekapMetode = {
  metodeKode: string;
  metodeNama: string;
  isTunai: boolean;
  totalJumlah: number;
  jumlahTransaksi: number;
};

export type PosShiftRekap = {
  shift: PosShift;
  jumlahTransaksi: number;
  totalPenjualan: number;
  totalTunaiMasuk: number;
  totalNonTunai: number;
  uangAkhirEkspektasi: number;
  perMetode: PosShiftRekapMetode[];
};

export type PosCatalogItem = {
  kode: string;
  nama: string;
  tipe: "Barang" | "Jasa" | string;
  satuan: string;
  harga: number;
  kategoriKode: string | null;
  kategoriNama: string | null;
  merekKode: string | null;
  stokDiGudang: number;
  punyaFoto: boolean;
};

export type PosCartLine = {
  /** id internal client-side untuk membedakan baris (memungkinkan item sama
   *  dengan harga override yang berbeda). */
  uid: string;
  barangKode: string;
  barangNama: string;
  satuan: string;
  satuanTingkat: number;
  qty: number;
  hargaSatuan: number;
  diskon: number;
  catatan: string;
  stokTersedia: number;
  isBarang: boolean;
};

export type PosPembayaranInput = {
  metodeKode: string;
  jumlah: number;
  refNo: string;
};

export type PosTransaksiResult = {
  nomor: string;
  total: number;
  totalDibayar: number;
  kembalian: number;
};

/** Kode pelanggan default untuk transaksi walk-in. */
export const POS_PELANGGAN_DEFAULT_KODE = "GUEST";
