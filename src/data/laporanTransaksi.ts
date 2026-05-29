/**
 * Tipe-tipe untuk laporan analitik penjualan & pembelian — yaitu agregasi
 * multi-dimensi (per pelanggan/pemasok, per barang, per bulan, per salesman)
 * yang digunakan oleh `LaporanPenjualanRingkasanPage` &
 * `LaporanPembelianRingkasanPage`.
 *
 * Berbeda dari halaman operasional `PenjualanPage`/`PembelianPage` yang
 * menampilkan satu baris per faktur (untuk navigasi/edit), laporan ini
 * menampilkan ringkasan untuk pengambilan keputusan (ranking, kontribusi,
 * tren bulanan, dll.).
 */

/** Ringkasan transaksi per partner (pelanggan untuk jual, pemasok untuk beli). */
export type RingkasanPartnerRow = {
  kode: string;
  nama: string;
  jumlahFaktur: number;
  qty: number;
  nominal: number;
  /** 0.0 – 1.0; proporsi `nominal` baris ini terhadap total laporan. */
  kontribusi: number;
};

/** Ringkasan transaksi per barang/jasa. */
export type RingkasanBarangRow = {
  kode: string;
  nama: string;
  kategoriKode: string;
  kategoriNama: string;
  jumlahFaktur: number;
  qty: number;
  /** Total `subtotal` baris (sebelum diskon & pajak faktur). */
  nominal: number;
  kontribusi: number;
};

/** Ringkasan transaksi per bulan kalender. */
export type RingkasanBulanRow = {
  /** Format `YYYY-MM`. */
  bulan: string;
  jumlahFaktur: number;
  qty: number;
  nominal: number;
};

/** Ringkasan transaksi per salesman (khusus penjualan). */
export type RingkasanSalesmanRow = {
  salesman: string;
  jumlahFaktur: number;
  qty: number;
  nominal: number;
  kontribusi: number;
};

export type LaporanTransaksiTotal = {
  jumlahFaktur: number;
  jumlahBaris: number;
  qty: number;
  nominal: number;
};

export type LaporanPenjualanSnapshot = {
  tanggalDari: string;
  tanggalSampai: string;
  perPelanggan: RingkasanPartnerRow[];
  perBarang: RingkasanBarangRow[];
  perBulan: RingkasanBulanRow[];
  perSalesman: RingkasanSalesmanRow[];
  total: LaporanTransaksiTotal;
};

export type LaporanPembelianSnapshot = {
  tanggalDari: string;
  tanggalSampai: string;
  perPemasok: RingkasanPartnerRow[];
  perBarang: RingkasanBarangRow[];
  perBulan: RingkasanBulanRow[];
  total: LaporanTransaksiTotal;
};

/** Format `YYYY-MM` → "Mei 2026" (id-ID). */
export function formatBulan(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map((s) => parseInt(s, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m)) return yyyyMm;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
