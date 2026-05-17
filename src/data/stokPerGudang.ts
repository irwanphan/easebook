export type StokPerGudangKolom = {
  kode: string;
  nama: string;
};

export type BarangStokPerGudangRow = {
  kode: string;
  nama: string;
  satuan: string;
  totalStok: number;
  /** Saldo per gudang; indeks selaras dengan `gudang` pada matriks. */
  stokPerGudang: number[];
};

export type StokPerGudangMatrix = {
  gudang: StokPerGudangKolom[];
  barang: BarangStokPerGudangRow[];
};
