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
