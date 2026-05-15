export type MonthPoint = {
  month: string;
  sales: number;
  revenue: number;
};

export const monthlySalesRevenue: MonthPoint[] = [
  { month: "Jan", sales: 12000, revenue: 11000 },
  { month: "Feb", sales: 15000, revenue: 14000 },
  { month: "Mar", sales: 11000, revenue: 12500 },
  { month: "Apr", sales: 18000, revenue: 16000 },
  { month: "May", sales: 14000, revenue: 15000 },
  { month: "Jun", sales: 16000, revenue: 15500 },
  { month: "Jul", sales: 19000, revenue: 17500 },
  { month: "Aug", sales: 22560, revenue: 21000 },
  { month: "Sep", sales: 17000, revenue: 16800 },
  { month: "Oct", sales: 20000, revenue: 19500 },
  { month: "Nov", sales: 21000, revenue: 20500 },
  { month: "Dec", sales: 23000, revenue: 22000 },
];

export const highlightMonth = "Aug";

export type DashboardOrder = {
  id: string;
  customer: string;
  items: number;
  zone: string;
  amount: number;
  status: "Memproses" | "Terkirim" | "Tertunda";
};

export const dashboardOrders: DashboardOrder[] = [
  {
    id: "#910923",
    customer: "Ralph Edwards",
    items: 15,
    zone: "A1",
    amount: 750,
    status: "Memproses",
  },
  {
    id: "#910924",
    customer: "Darlene Robertson",
    items: 10,
    zone: "A3",
    amount: 150,
    status: "Terkirim",
  },
  {
    id: "#910925",
    customer: "Courtney Henry",
    items: 8,
    zone: "C5",
    amount: 420,
    status: "Tertunda",
  },
  {
    id: "#910926",
    customer: "Jenny Wilson",
    items: 22,
    zone: "B2",
    amount: 980,
    status: "Terkirim",
  },
];

export type StockProduct = {
  id: string;
  name: string;
  category: string;
  sku: string;
  imageUrl: string;
};

export const stockProducts: StockProduct[] = [
  {
    id: "1",
    name: "Headphones",
    category: "Elektronik",
    sku: "A2-368",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop",
  },
  {
    id: "2",
    name: "Kemeja denim",
    category: "Pakaian",
    sku: "B2-682",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b87?w=200&h=200&fit=crop",
  },
  {
    id: "3",
    name: "Botol minum",
    category: "Aksesoris",
    sku: "C1-104",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111540de692?w=200&h=200&fit=crop",
  },
];

export type BarangJasaRow = {
  kode: string;
  nama: string;
  tipe: "Barang" | "Jasa";
  satuan: string;
  harga: number;
  stok?: number;
  /** Diisi dari SQLite bila ada relasi master */
  kategoriKode?: string | null;
  merekKode?: string | null;
  defaultGudangKode?: string | null;
};

export const mockBarangJasa: BarangJasaRow[] = [
  { kode: "BRG-001", nama: "Headphones ANC", tipe: "Barang", satuan: "pcs", harga: 899000, stok: 48 },
  { kode: "JS-010", nama: "Instalasi POS", tipe: "Jasa", satuan: "job", harga: 2500000 },
  { kode: "BRG-002", nama: "Kemeja denim", tipe: "Barang", satuan: "pcs", harga: 349000, stok: 120 },
];

export type PenjualanRow = {
  noFaktur: string;
  tanggal: string;
  pelanggan: string;
  total: number;
  status: "Draft" | "Lunas" | "Menunggu";
};

export const mockPenjualan: PenjualanRow[] = [
  { noFaktur: "SO-2024-001", tanggal: "2024-08-02", pelanggan: "PT Mitra Jaya", total: 12500000, status: "Lunas" },
  { noFaktur: "SO-2024-002", tanggal: "2024-08-05", pelanggan: "CV Sinar", total: 3200000, status: "Menunggu" },
];
