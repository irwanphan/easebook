/** Definisi halaman yang bisa diatur hak aksesnya (selaras dengan rute di router). */
export type HalamanAksesPage = {
  key: string;
  label: string;
  /** Pola path tanpa leading slash; segmen `:param` untuk dinamis. */
  pathPattern: string;
};

export type HalamanAksesGroup = {
  id: string;
  label: string;
  pages: HalamanAksesPage[];
};

export const halamanAksesGroups: HalamanAksesGroup[] = [
  {
    id: "umum",
    label: "Umum",
    pages: [
      { key: "dashboard", label: "Dashboard", pathPattern: "" },
      { key: "pengaturan", label: "Pengaturan", pathPattern: "pengaturan" },
      { key: "pos", label: "Kasir POS", pathPattern: "pos" },
      // Aksi sensitif — bukan halaman. Tetap dipakai sebagai permission key
      // sehingga muncul di Manajemen → Pengguna → Hak akses. Pola path tidak
      // pernah dipakai di router (sintetik) agar tidak mengganggu navigasi.
      {
        key: "pengaturan-ubah-awal-periode",
        label: "Pengaturan: Ubah tanggal awal periode",
        pathPattern: "pengaturan/aksi/ubah-awal-periode",
      },
      {
        key: "pengaturan-ubah-kas-awal",
        label: "Pengaturan: Ubah saldo kas awal yang sudah disetel",
        pathPattern: "pengaturan/aksi/ubah-kas-awal",
      },
      {
        key: "pengaturan-ubah-stok-awal",
        label: "Pengaturan: Ubah saldo stok awal yang sudah disetel",
        pathPattern: "pengaturan/aksi/ubah-stok-awal",
      },
    ],
  },
  {
    id: "barang-jasa",
    label: "Barang & jasa",
    pages: [
      { key: "barang-jasa", label: "Daftar barang & jasa", pathPattern: "barang-jasa" },
      { key: "barang-jasa-tambah", label: "Tambah barang / jasa", pathPattern: "barang-jasa/tambah" },
      { key: "barang-jasa-ubah", label: "Ubah barang / jasa", pathPattern: "barang-jasa/ubah/:kode" },
      { key: "barang-jasa-kartu-stok", label: "Kartu stok barang", pathPattern: "barang-jasa/kartu-stok/:kode" },
      { key: "barang-jasa-per-gudang", label: "Stok per gudang", pathPattern: "barang-jasa/per-gudang" },
      {
        key: "barang-jasa-mutasi",
        label: "Mutasi antar gudang",
        pathPattern: "barang-jasa/mutasi-antar-gudang",
      },
      {
        key: "barang-jasa-stok-awal",
        label: "Pengaturan stok awal",
        pathPattern: "barang-jasa/atur-stok-awal",
      },
      { key: "produksi", label: "Daftar produksi", pathPattern: "barang-jasa/produksi" },
      {
        key: "produksi-tambah",
        label: "Tambah produksi",
        pathPattern: "barang-jasa/produksi/tambah",
      },
      {
        key: "produksi-ubah",
        label: "Ubah produksi",
        pathPattern: "barang-jasa/produksi/ubah/:nomor",
      },
      {
        key: "produksi-detail",
        label: "Detail produksi",
        pathPattern: "barang-jasa/produksi/detail/:nomor",
      },
    ],
  },
  {
    id: "penjualan",
    label: "Penjualan",
    pages: [
      { key: "penjualan", label: "Daftar penjualan", pathPattern: "penjualan" },
      { key: "penjualan-tambah", label: "Tambah penjualan", pathPattern: "penjualan/tambah" },
    ],
  },
  {
    id: "pembelian",
    label: "Pembelian",
    pages: [
      { key: "pembelian", label: "Daftar pembelian", pathPattern: "pembelian" },
      { key: "pembelian-tambah", label: "Tambah pembelian", pathPattern: "pembelian/tambah" },
      { key: "pembelian-detail", label: "Detail pembelian", pathPattern: "pembelian/detail/:nomor" },
      { key: "pembelian-ubah", label: "Ubah pembelian", pathPattern: "pembelian/ubah/:nomor" },
    ],
  },
  {
    id: "laporan",
    label: "Laporan",
    pages: [
      {
        key: "lap-stok",
        label: "Pergerakan stok",
        pathPattern: "laporan/pergerakan-stok",
      },
      {
        key: "lap-mutasi-gudang",
        label: "Mutasi antar gudang",
        pathPattern: "laporan/mutasi-antar-gudang",
      },
      {
        key: "lap-laba-rugi",
        label: "Laba rugi",
        pathPattern: "laporan/laba-rugi",
      },
      {
        key: "lap-neraca",
        label: "Neraca",
        pathPattern: "laporan/neraca",
      },
      {
        key: "lap-arus-kas",
        label: "Arus kas",
        pathPattern: "laporan/arus-kas",
      },
      {
        key: "lap-log-shift-pos",
        label: "Log shift POS",
        pathPattern: "laporan/log-shift-pos",
      },
    ],
  },
  {
    id: "manajemen",
    label: "Manajemen",
    pages: [
      { key: "mj-kategori", label: "Kategori / grup barang", pathPattern: "manajemen/kategori" },
      { key: "mj-kategori-tambah", label: "Tambah kategori", pathPattern: "manajemen/kategori/tambah" },
      { key: "mj-kategori-ubah", label: "Ubah kategori", pathPattern: "manajemen/kategori/ubah/:kode" },
      { key: "mj-merk", label: "Merek", pathPattern: "manajemen/merek" },
      { key: "mj-merk-tambah", label: "Tambah merek", pathPattern: "manajemen/merek/tambah" },
      { key: "mj-merk-ubah", label: "Ubah merek", pathPattern: "manajemen/merek/ubah/:kode" },
      { key: "mj-gudang", label: "Gudang", pathPattern: "manajemen/gudang" },
      { key: "mj-gudang-tambah", label: "Tambah gudang", pathPattern: "manajemen/gudang/tambah" },
      { key: "mj-gudang-ubah", label: "Ubah gudang", pathPattern: "manajemen/gudang/ubah/:kode" },
      { key: "mj-pelanggan", label: "Pelanggan", pathPattern: "manajemen/pelanggan" },
      { key: "mj-pelanggan-tambah", label: "Tambah pelanggan", pathPattern: "manajemen/pelanggan/tambah" },
      { key: "mj-pelanggan-ubah", label: "Ubah pelanggan", pathPattern: "manajemen/pelanggan/ubah/:kode" },
      { key: "mj-pemasok", label: "Pemasok", pathPattern: "manajemen/pemasok" },
      { key: "mj-pemasok-tambah", label: "Tambah pemasok", pathPattern: "manajemen/pemasok/tambah" },
      { key: "mj-pemasok-ubah", label: "Ubah pemasok", pathPattern: "manajemen/pemasok/ubah/:kode" },
      { key: "mj-pengguna", label: "Pengguna", pathPattern: "manajemen/pengguna" },
      { key: "mj-pengguna-tambah", label: "Tambah pengguna", pathPattern: "manajemen/pengguna/tambah" },
      { key: "mj-pengguna-ubah", label: "Ubah pengguna", pathPattern: "manajemen/pengguna/ubah/:username" },
    ],
  },
  {
    id: "keuangan",
    label: "Keuangan",
    pages: [
      { key: "ke-pengeluaran", label: "Pengeluaran", pathPattern: "keuangan/pengeluaran" },
      { key: "ke-pengeluaran-tambah", label: "Tambah pengeluaran", pathPattern: "keuangan/pengeluaran/tambah" },
      { key: "ke-penerimaan", label: "Penerimaan", pathPattern: "keuangan/penerimaan" },
      { key: "ke-penerimaan-tambah", label: "Tambah penerimaan", pathPattern: "keuangan/penerimaan/tambah" },
      { key: "ke-piutang", label: "Daftar piutang", pathPattern: "keuangan/piutang/daftar-piutang" },
      {
        key: "ke-piutang-daftar",
        label: "Daftar pelunasan piutang",
        pathPattern: "keuangan/piutang/daftar-pelunasan",
      },
      {
        key: "ke-piutang-daftar-detail",
        label: "Detail pelunasan piutang",
        pathPattern: "keuangan/piutang/daftar-pelunasan/:nomor",
      },
      {
        key: "ke-piutang-buat",
        label: "Buat pelunasan piutang",
        pathPattern: "keuangan/piutang/buat-pelunasan",
      },
      {
        key: "ke-piutang-aging",
        label: "Laporan aging piutang",
        pathPattern: "keuangan/piutang/aging",
      },
      { key: "ke-hutang", label: "Daftar hutang", pathPattern: "keuangan/hutang/daftar-hutang" },
      {
        key: "ke-hutang-daftar",
        label: "Daftar pelunasan hutang",
        pathPattern: "keuangan/hutang/daftar-pelunasan",
      },
      {
        key: "ke-hutang-daftar-detail",
        label: "Detail pelunasan hutang",
        pathPattern: "keuangan/hutang/daftar-pelunasan/:nomor",
      },
      {
        key: "ke-hutang-buat",
        label: "Buat pelunasan hutang",
        pathPattern: "keuangan/hutang/buat-pelunasan",
      },
      {
        key: "ke-hutang-aging",
        label: "Laporan aging hutang",
        pathPattern: "keuangan/hutang/aging",
      },
      { key: "ke-transfer", label: "Transfer", pathPattern: "keuangan/transfer" },
      { key: "ke-daftar-akun", label: "Daftar akun", pathPattern: "keuangan/daftar-akun" },
      { key: "ke-akun-kas", label: "Akun kas", pathPattern: "keuangan/akun-kas" },
      { key: "ke-kas-awal", label: "Pengaturan kas awal", pathPattern: "keuangan/kas-awal" },
      {
        key: "ke-konfigurasi-akun-jurnal",
        label: "Konfigurasi akun jurnal",
        pathPattern: "keuangan/konfigurasi-akun-jurnal",
      },
      { key: "ke-jurnal-umum", label: "Jurnal umum", pathPattern: "keuangan/jurnal-umum" },
      { key: "ke-buku-besar", label: "Buku besar", pathPattern: "keuangan/buku-besar" },
    ],
  },
];

export const allHalamanAksesKeys: string[] = halamanAksesGroups.flatMap((g) => g.pages.map((p) => p.key));

const halamanByKey = new Map<string, HalamanAksesPage>();
for (const g of halamanAksesGroups) {
  for (const p of g.pages) {
    halamanByKey.set(p.key, p);
  }
}

export function getHalamanDef(key: string): HalamanAksesPage | undefined {
  return halamanByKey.get(key);
}
