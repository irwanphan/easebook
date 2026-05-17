/** Titik grafik penjualan & pendapatan per bulan (API `dashboard_penjualan_bulanan`). */
export type DashboardPenjualanBulananPoint = {
  month: string;
  monthNum: number;
  sales: number;
  revenue: number;
};

export type DashboardPenjualanBulananResult = {
  year: number;
  points: DashboardPenjualanBulananPoint[];
  availableYears: number[];
  highlightMonth: number;
};

export type DashboardPenjualanRingkasanBulan = {
  jumlahFaktur: number;
  nilaiTotal: number;
  jumlahTerlunasi: number;
  nilaiTerlunasi: number;
};

export type DashboardPenjualanRingkasan = {
  bulanIni: DashboardPenjualanRingkasanBulan;
  bulanLalu: DashboardPenjualanRingkasanBulan;
  piutangJumlah: number;
  piutangNilai: number;
  labelBulanIni: string;
};
